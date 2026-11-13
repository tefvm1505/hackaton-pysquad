import os
import pytesseract
from PIL import Image
import re
import json
from models.facturas import Facturas, ItemsFactura
from models.contratos import Contratos
from models.causacion import Causaciones
from pypdf import PdfReader
from fastapi import HTTPException
from sqlalchemy.orm import Session

# En Windows hay que indicar dónde quedó instalado Tesseract (se puede cambiar con TESSERACT_CMD).
# En Linux y en Docker el programa ya está en el PATH y no se configura nada.
if os.name == "nt":
    pytesseract.pytesseract.tesseract_cmd = os.getenv(
        "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )

CAMPOS_REQUERIDOS = [
    "emisor", "nit_emisor", "numero_factura", "fecha_emision",
    "fecha_vencimiento", "cliente", "nit_cliente", "orden_compra",
    "moneda", "contrato", "subtotal", "iva", "total_pagar", "cufe"
]

def validar_datos_factura(datos: dict):
    faltantes = []
    for campo in CAMPOS_REQUERIDOS:
        if datos.get(campo) is None or datos.get(campo) == "":
            faltantes.append(campo)

    if not datos.get("items"):
        faltantes.append("items")

    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudieron extraer todos los datos de la factura. Campos faltantes: {', '.join(faltantes)}"
        )

    return datos

def parsear_factura_electronica(texto: str):
    datos = {
        "emisor": None,
        "nit_emisor": None,
        "numero_factura": None,
        "fecha_emision": None,
        "fecha_vencimiento": None,
        "cliente": None,
        "nit_cliente": None,
        "orden_compra": None,
        "moneda": None,
        "contrato": None,
        "items": [],
        "subtotal": None,
        "iva": None,
        "total_pagar": None,
        "cufe": None
    }

    # 1. Emisor (primera línea no vacía)
    lineas = [l.strip() for l in texto.split("\n") if l.strip()]
    if lineas:
        datos["emisor"] = lineas[0]

    # 2. NIT Emisor
    nit_emisor_match = re.search(r"NIT:\s*([\d\.-]+)", texto)
    if nit_emisor_match:
        datos["nit_emisor"] = nit_emisor_match.group(1).strip()

    # 3. Número de factura
    factura_match = re.search(r"FACTURA\s+ELECTRÓNICA\s+DE\s+VENTA\s+No\.\s*([A-Z0-9\-]+)", texto, re.IGNORECASE)
    if factura_match:
        datos["numero_factura"] = factura_match.group(1).strip()

    # 4. Fechas
    emision_match = re.search(r"Fecha de emisión:\s*[—\-]?\s*(\d{4}-\d{2}-\d{2})", texto)
    if emision_match:
        datos["fecha_emision"] = emision_match.group(1)

    vencimiento_match = re.search(r"Fecha de vencimiento:\s*(\d{4}-\d{2}-\d{2})", texto)
    if vencimiento_match:
        datos["fecha_vencimiento"] = vencimiento_match.group(1)

    # 5. Datos del cliente, orden, moneda y contrato
    cliente_match = re.search(r"Cliente:\s*(.+?)\s+NIT cliente:", texto)
    if cliente_match:
        datos["cliente"] = cliente_match.group(1).strip()

    nit_cliente_match = re.search(r"NIT cliente:\s*([\d\.-]+)", texto)
    if nit_cliente_match:
        datos["nit_cliente"] = nit_cliente_match.group(1).strip()

    oc_match = re.search(r"Orden de compra:\s*([A-Z0-9\-]+)", texto)
    if oc_match:
        datos["orden_compra"] = oc_match.group(1).strip()

    moneda_match = re.search(r"Moneda:\s*([a-zA-Z]+)", texto)
    if moneda_match:
        datos["moneda"] = moneda_match.group(1).strip().upper()

    contrato_match = re.search(r"Contrato:\s*\n?\s*([A-Z0-9\-]+)", texto, re.IGNORECASE)
    if contrato_match:
        datos["contrato"] = contrato_match.group(1).strip().upper()

    subtotal_match = re.search(r"Subtotal\s*\$?([\d\.,]+)", texto, re.IGNORECASE)
    if subtotal_match:
        datos["subtotal"] = subtotal_match.group(1).strip()

    iva_match = re.search(r"IVA\s*[\d%]*\s*\$?([\d\.,]+)", texto, re.IGNORECASE)
    if iva_match:
        datos["iva"] = iva_match.group(1).strip()

    total_match = re.search(r"TOTAL\s+A\s+PAGAR\s*\$?([\d\.,]+)", texto, re.IGNORECASE)
    if total_match:
        datos["total_pagar"] = total_match.group(1).strip()

    cufe_match = re.search(r"CUFE:\s*([a-f0-9]+)", texto, re.IGNORECASE)
    if cufe_match:
        datos["cufe"] = cufe_match.group(1).strip()

    patron_item = r"^(.+?)\s+(\d+)\s*(?:[A-Za-z]\s*)?\$([\d\.,]+)\s+\$([\d\.,]+)$"
    for linea in lineas:
        if any(palabra in linea.lower() for palabra in ["subtotal", "iva", "total a pagar", "cufe"]):
            continue
        match_item = re.match(patron_item, linea)
        if match_item:
            datos["items"].append({
                "descripcion": match_item.group(1).strip(),
                "cantidad": int(match_item.group(2)),
                "precio_unitario": match_item.group(3).strip(),
                "total": match_item.group(4).strip()
            })

    return validar_datos_factura(datos)


def parsear_factura_pdf(texto: str):
    datos = {
        "emisor": None,
        "nit_emisor": None,
        "numero_factura": None,
        "fecha_emision": None,
        "fecha_vencimiento": None,
        "cliente": None,
        "nit_cliente": None,
        "orden_compra": None,
        "moneda": None,
        "contrato": None, 
        "items": [],
        "subtotal": None,
        "iva": None,
        "total_pagar": None,
        "cufe": None
    }

    texto_limpio = texto.replace("\\n", "\n")
    lineas = [l.strip() for l in texto_limpio.split("\n") if l.strip()]

    if lineas:
        datos["emisor"] = lineas[0]

    m = re.search(r"NIT:\s*([\d\.-]+)", texto_limpio)
    if m:
        datos["nit_emisor"] = m.group(1).strip()

    m = re.search(r"FACTURA\s+ELECTRÓNICA\s+DE\s+VENTA\s+No\.\s*([A-Z0-9\-]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["numero_factura"] = m.group(1).strip()

    m = re.search(r"Fecha de emisión:\s*(\d{4}-\d{2}-\d{2})", texto_limpio, re.IGNORECASE)
    if m:
        datos["fecha_emision"] = m.group(1)

    m = re.search(r"Fecha de vencimiento:\s*(\d{4}-\d{2}-\d{2})", texto_limpio, re.IGNORECASE)
    if m:
        datos["fecha_vencimiento"] = m.group(1)

    m = re.search(r"Cliente:\s*\n?\s*(.+?)(?=\s*NIT cliente:|\nNIT cliente:)", texto_limpio, re.IGNORECASE)
    if m:
        datos["cliente"] = m.group(1).strip()

    m = re.search(r"NIT cliente:\s*\n?\s*([\d\.-]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["nit_cliente"] = m.group(1).strip()

    m = re.search(r"Orden de compra:\s*\n?\s*([A-Z0-9\-]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["orden_compra"] = m.group(1).strip()

    m = re.search(r"Moneda:\s*\n?\s*([a-zA-Z]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["moneda"] = m.group(1).strip().upper()

    m = re.search(r"Contrato:\s*\n?\s*([A-Z0-9\-]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["contrato"] = m.group(1).strip().upper()

    m = re.search(r"Subtotal\s*\n?\s*\$?([\d\.,]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["subtotal"] = m.group(1).strip()

    m = re.search(r"IVA\s*[\d%]*\s*\n?\s*\$?([\d\.,]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["iva"] = m.group(1).strip()

    m = re.search(r"TOTAL\s+A\s+PAGAR\s*\n?\s*\$?([\d\.,]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["total_pagar"] = m.group(1).strip()

    m = re.search(r"CUFE:\s*([a-f0-9]+)", texto_limpio, re.IGNORECASE)
    if m:
        datos["cufe"] = m.group(1).strip()

    patron_item_vertical = re.compile(
        r"^(?P<desc>[^\n\$]+?)\n(?P<cant>\d+)\n\$(?P<unit>[\d\.,]+)\n\$(?P<tot>[\d\.,]+)$",
        re.MULTILINE
    )

    for match in patron_item_vertical.finditer(texto_limpio):
        desc = match.group("desc").strip()
        if any(encabezado in desc.lower() for encabezado in ["descripción", "valor unitario", "valor total", "cant."]):
            continue
        datos["items"].append({
            "descripcion": desc,
            "cantidad": int(match.group("cant")),
            "precio_unitario": match.group("unit").strip(),
            "total": match.group("tot").strip()
        })

    return validar_datos_factura(datos)

def ocr_sin_ia(ruta_imagen: str):
    if not os.path.exists(ruta_imagen):
        raise FileNotFoundError(f"No se encontró el archivo: {ruta_imagen}")

    imagen = Image.open(ruta_imagen)
    texto_extraido = pytesseract.image_to_string(imagen, lang="spa")
    
    return parsear_factura_electronica(texto_extraido)

def leer_pdf_facil(ruta_pdf: str) -> str:
    lector = PdfReader(ruta_pdf)
    # Extrae el texto de todas las páginas y las junta
    texto = "\n".join([pagina.extract_text() for pagina in lector.pages if pagina.extract_text()])
    return parsear_factura_pdf(texto)


def fila_a_dict(fila):
    return {columna.name: getattr(fila, columna.name) for columna in fila.__table__.columns}


def traer_facturas(db: Session):
    facturas = db.query(Facturas).all()

    resultado = []
    for factura in facturas:
        factura_dict = fila_a_dict(factura)

        # Buscamos la primera causación de esta factura para obtener el estado
        primera_causacion = db.query(Causaciones).filter(
            Causaciones.id_factura == factura.cufe
        ).order_by(Causaciones.id.asc()).first()

        factura_dict["estado"] = primera_causacion.estado if primera_causacion else "sin causación"

        resultado.append(factura_dict)

    return resultado


def traer_causaciones_por_factura(cufe: str, db: Session):
    factura = db.query(Facturas).filter(Facturas.cufe == cufe).first()
    if not factura:
        raise HTTPException(status_code=404, detail=f"No se encontró una factura con el CUFE: {cufe}")

    causaciones = db.query(Causaciones).filter(
        Causaciones.id_factura == cufe
    ).order_by(Causaciones.id.asc()).all()

    return [fila_a_dict(c) for c in causaciones]


def traer_contratos(db: Session):
    contratos = db.query(Contratos).all()
    return [fila_a_dict(c) for c in contratos]


def traer_causaciones(db: Session):
    causaciones = db.query(Causaciones).all()
    return [fila_a_dict(c) for c in causaciones]
