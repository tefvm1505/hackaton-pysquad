from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
from config_db import get_db
from services.ia import responder_pregunta
import os
import uuid
from services.facturas import ocr_sin_ia, leer_pdf_facil, traer_facturas, traer_causaciones_por_factura, traer_contratos, traer_causaciones
from models.facturas import Facturas, ItemsFactura
from fastapi import HTTPException
import re
from models.contratos import Contratos, Tarifas_Pactadas
from services.ia import responder_pregunta
from models.causacion import Causaciones
from services.usuarios import verificar_token


router = APIRouter()

EXTENSIONES_IMAGEN = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
EXTENSIONES_TEXTO_DOC = {".pdf", ".docx", ".doc", ".txt"}

@router.post("/subir")
async def identificar_tipo_archivo(archivo: UploadFile = File(...), db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    nombre_archivo = archivo.filename or ""
    _, extension = os.path.splitext(nombre_archivo.lower())

    content_type = archivo.content_type or ""

    if extension in EXTENSIONES_IMAGEN or content_type.startswith("image/"):
        codigo_uuid = uuid.uuid4()
        nombre_guardado = f"factura_{codigo_uuid}.png"
        ruta_destino = os.path.join("facturas", nombre_guardado)
    
        with open(ruta_destino, "wb") as buffer:
            buffer.write(await archivo.read())
        txt1 = ocr_sin_ia(ruta_destino)
        return crear_factura(txt1, db)
    elif extension in EXTENSIONES_TEXTO_DOC or content_type in [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain"
    ]:
        codigo_uuid = uuid.uuid4()
        nombre_guardado = f"factura_{codigo_uuid}.pdf"
        ruta_destino = os.path.join("facturas_pdf", nombre_guardado)

        with open(ruta_destino, "wb") as buffer:
            while chunk := await archivo.read(1024 * 1024):
                buffer.write(chunk)
        txt2 = leer_pdf_facil(ruta_destino)
        return crear_factura(txt2, db)
    else:
        return "formato desconocido"

def limpiar_valor(valor) -> int:
    if not valor:
        return 0
    solo_numeros = re.sub(r"\D", "", str(valor))
    return int(solo_numeros) if solo_numeros else 0

def crear_factura(datos, db):
    buscarfacturaigual = db.query(Facturas).filter(
        Facturas.cufe == datos["cufe"]
    ).first()

    datosparalaia = []
    if buscarfacturaigual:
        datosparalaia.append({
            "descripcion": "error factura duplicada en el sistema, no se guardo en la base de datos ya que existe un mismo registro",
            "estado": "rechazada"
            })
        return responder_pregunta(datosparalaia)

    facturanueva = Facturas(
        cufe=datos["cufe"],
        emisor=datos["emisor"],
        nit_emisor=datos["nit_emisor"],
        numero_factura=datos["numero_factura"],
        fecha_emision=datos["fecha_emision"],
        fecha_vencimiento=datos["fecha_vencimiento"],
        cliente=datos["cliente"],
        nit_cliente=datos["nit_cliente"],
        orden_compra=datos["orden_compra"],
        moneda=datos["moneda"],
        subtotal=limpiar_valor(datos["subtotal"]),
        iva=limpiar_valor(datos["iva"]),
        total_pagar=limpiar_valor(datos["total_pagar"]),
        id_contrato=datos["contrato"]
    )

    db.add(facturanueva)
    db.commit()
    db.refresh(facturanueva)

    for i in datos["items"]:
        itemsfactura = ItemsFactura(
            descripcion = i["descripcion"],
            cantidad = i["cantidad"],
            precio_unitario = limpiar_valor(i["precio_unitario"]),
            total = limpiar_valor(i["total"]),
            id_factura = facturanueva.cufe
        )

        db.add(itemsfactura)

    db.commit()

    return buscarcontrato(datos, db)

def crearcausacion(id_factura, id_contrato, estado, segerencia, db):
    buscarfactura = db.query(Facturas).filter(
        Facturas.cufe == id_factura
    ).first()
    if not buscarfactura:
        HTTPException(status_code=404, detail=f"error no se encontro una factura con el id {id_factura} en la db")
    buscarcontrato = db.query(Contratos).filter(
            Contratos.id_contrato == id_contrato
        ).first()
    if not buscarcontrato:
        HTTPException(status_code=404, detail=f"error no se encontro un contrato con el id {id_contrato} en la db")

    causacionnueva = Causaciones(
        id_factura = buscarfactura.cufe,
        id_contrato = buscarcontrato.id_contrato,
        estado = estado,
        sugerencia = segerencia
    )

    db.add(causacionnueva)
    db.commit()

    return "causacion creada"
    

def buscarcontrato(datos, db):
    contrato = db.query(Contratos).filter(
        Contratos.id_contrato == datos["contrato"]
    ).first()

    if not contrato:
        raise HTTPException(status_code=404, detail="No se encontró un contrato para la factura")

    buscarfactura = db.query(Facturas).filter(
        Facturas.cufe == datos["cufe"]
    ).first()

    datosparalaia = []

    if not buscarfactura:
        datosparalaia.append({
            "descripcion": "Error, no se encontró la factura en la base de datos para realizar la validación.",
            "estado": "rechazada"
        })
        return responder_pregunta(datosparalaia)

    nit_contrato_limpio = contrato.proveedor_nit.replace(".", "").strip()
    nit_factura_limpio = buscarfactura.nit_emisor.replace(".", "").strip()

    if nit_contrato_limpio != nit_factura_limpio:
        datosparalaia.append({
            "descripcion": f"Error: El NIT del proveedor en el contrato ({contrato.proveedor_nit}) y el emisor en la factura ({buscarfactura.nit_emisor}) no coinciden.",
            "estado": "rechazada"
        })

    validariva = round(float(buscarfactura.subtotal) * 0.19, 2)
    iva_factura = round(float(buscarfactura.iva), 2)

    if validariva != iva_factura:
        datosparalaia.append({
            "descripcion": f"Error matemático: El cálculo del 19% sobre el subtotal da {validariva}, pero la factura reporta {iva_factura}.",
            "estado": "con errores"
        })

    buscaritemsfactura = db.query(ItemsFactura).filter(
        ItemsFactura.id_factura == buscarfactura.cufe
    ).all()

    tarifas_contrato = db.query(Tarifas_Pactadas).filter(
        Tarifas_Pactadas.id_contrato == buscarfactura.id_contrato
    ).all()

    mapa_tarifas = {tarifa.concepto: tarifa.valor_unitario_maximo for tarifa in tarifas_contrato}

    for f in buscaritemsfactura:
        if f.descripcion not in mapa_tarifas:
            datosparalaia.append({
                "descripcion": f"Error: el ítem '{f.descripcion}' no se encuentra dentro de las tarifas del contrato.",
                "estado": "con errores"
            })
            continue

        valor_maximo = mapa_tarifas[f.descripcion]
        if f.precio_unitario > valor_maximo:
            datosparalaia.append({
                "descripcion": f"Error: el ítem '{f.descripcion}' ({f.precio_unitario}) supera el precio máximo de la tarifa pactada ({valor_maximo}).",
                "estado": "requiere revision"
            })
            
    # === VALIDACIÓN DE TOPES SEGÚN FRECUENCIA ===
    valor_factura = float(buscarfactura.total_pagar)

    if contrato.frecuencia == "acumulado":
        valorapagar = float(contrato.valor_total)
        acumulado = 0

        # Buscamos las facturas de este contrato que ya tengan una causación "validada"
        facturas_validadas = db.query(Facturas).filter(
            Facturas.id_contrato == contrato.id_contrato,
            Facturas.cufe.in_(
                db.query(Causaciones.id_factura).filter(Causaciones.estado == "validada")
            )
        ).all()

        for a in facturas_validadas:
            if a.cufe != buscarfactura.cufe:
                acumulado += float(a.total_pagar)

        # Sumamos la factura actual que estamos evaluando
        acumulado += valor_factura

        if acumulado > valorapagar:
            datosparalaia.append({
                "descripcion": f"Error: La frecuencia es acumulada. El tope del contrato es {valorapagar}, pero con esta factura el acumulado de aprobadas llegaría a {acumulado}, superando el límite.",
                "estado": "rechazada"
            })

    else:
        # Para mensual, trimestral, anual: el total de la factura debe ser IGUAL al valor_periodo
        valor_periodo = float(contrato.valor_periodo)
        if valor_factura != valor_periodo:
            datosparalaia.append({
                "descripcion": f"Error: La frecuencia del contrato es '{contrato.frecuencia}'. El valor de la factura ({valor_factura}) no coincide con el valor del período ({valor_periodo}). Deben ser iguales.",
                "estado": "rechazada"
            })

    if not datosparalaia:
        item_exito = {
            "descripcion": "Pasó todas las validaciones (matemáticas, de ítems y topes contractuales) correctamente. La factura es válida.",
            "estado": "validada"
        }
        
        # Que la IA redacte el mensaje de aprobación
        respuestaIA = responder_pregunta([item_exito])
        
        crearcausacion(
            id_factura=buscarfactura.cufe, 
            id_contrato=contrato.id_contrato, 
            estado="validada", 
            segerencia=respuestaIA, 
            db=db
        )
        return respuestaIA

    respuestas_front = []

    for item in datosparalaia:
        sugerencia_individual = responder_pregunta([item])
        
        crearcausacion(
            id_factura=buscarfactura.cufe, 
            id_contrato=contrato.id_contrato, 
            estado=item["estado"], 
            segerencia=sugerencia_individual, 
            db=db
        )
        
        respuestas_front.append(sugerencia_individual)

    return "\n\n".join(respuestas_front)


@router.get("/facturas")
def obtener_facturas(db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    return traer_facturas(db)


@router.get("/causaciones/factura/{cufe}")
def obtener_causaciones_por_factura(cufe: str, db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    return traer_causaciones_por_factura(cufe, db)


@router.get("/contratos")
def obtener_contratos(db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    return traer_contratos(db)


@router.get("/causaciones")
def obtener_causaciones(db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    return traer_causaciones(db)