"""
Rutas y controladores relacionados con la carga, procesamiento,
auditoría de tres vías (Contrato - OC - Factura) y consulta de facturas y causaciones.
"""
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
from models.ordenescompra import OrdenCompra, ItemOrdenCompra, EstadoOrdenEnum
from services.ia import responder_pregunta
from models.causacion import Causaciones
from services.usuarios import verificar_token


router = APIRouter()

EXTENSIONES_IMAGEN = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
EXTENSIONES_TEXTO_DOC = {".pdf", ".docx", ".doc", ".txt"}

@router.post("/subir")
async def identificar_tipo_archivo(archivo: UploadFile = File(...), db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    """
    Recibe un archivo de factura (imagen o PDF), lo guarda temporalmente,
    extrae sus datos mediante OCR o lectura de texto y procede a registrarla en la BD.
    """
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
    """Extrae únicamente los dígitos numéricos de un valor monetario o texto."""
    if not valor:
        return 0
    solo_numeros = re.sub(r"\D", "", str(valor))
    return int(solo_numeros) if solo_numeros else 0

def crear_factura(datos, db):
    """
    Verifica duplicidad de CUFE y almacena la factura con sus ítems en la base de datos.
    Luego invoca la validación contractual de 3 vías.
    """
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
    """
    Registra el resultado de la auditoría en la tabla de causaciones.
    Actualiza automáticamente el estado de la Orden de Compra asociada a APROBADA o CANCELADA.
    """
    buscarfactura = db.query(Facturas).filter(
        Facturas.cufe == id_factura
    ).first()
    if not buscarfactura:
        raise HTTPException(status_code=404, detail=f"error no se encontro una factura con el id {id_factura} en la db")
    buscarcontrato = db.query(Contratos).filter(
        Contratos.id_contrato == id_contrato
    ).first()
    if not buscarcontrato:
        raise HTTPException(status_code=404, detail=f"error no se encontro un contrato con el id {id_contrato} en la db")

    causacionnueva = Causaciones(
        id_factura = buscarfactura.cufe,
        id_contrato = buscarcontrato.id_contrato,
        estado = estado,
        sugerencia = segerencia
    )

    db.add(causacionnueva)

    # Actualizar estado de la orden de compra según el resultado de la causación
    if buscarfactura.orden_compra:
        oc_codigo = str(buscarfactura.orden_compra).strip()
        orden = db.query(OrdenCompra).filter(
            (OrdenCompra.numero_orden == oc_codigo) |
            ((OrdenCompra.id == int(oc_codigo)) if oc_codigo.isdigit() else (OrdenCompra.numero_orden == oc_codigo))
        ).first()

        if orden:
            if estado in ["validada", "aprobada", "validado", "aprobado"]:
                orden.estado = EstadoOrdenEnum.APROBADA
            else:
                orden.estado = EstadoOrdenEnum.CANCELADA

    db.commit()

    return "causacion creada"
    

def buscarcontrato(datos, db):
    """
    Ejecuta la validación de tres vías (Three-Way Matching) entre Factura, Orden de Compra y Contrato:
    1. Verifica la existencia de la Orden de Compra asociada.
    2. Valida que la Orden de Compra pertenezca al Contrato.
    3. Compara coincidencia cruzada de NITs (Contrato, OC y Factura).
    4. Valida consistencia de subtotales y cálculo de IVA.
    5. Valida ítems, cantidades y precios unitarios frente al contrato y a la orden de compra.
    6. Valida topes presupuestales y montos según la periodicidad o frecuencia del contrato.
    7. Genera la respuesta mediante IA y crea las causaciones correspondientes.
    """
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

    orden_compra_codigo = str(buscarfactura.orden_compra or "").strip()
    buscar_oc = db.query(OrdenCompra).filter(
        (OrdenCompra.numero_orden == orden_compra_codigo) |
        ((OrdenCompra.id == int(orden_compra_codigo)) if orden_compra_codigo.isdigit() else (OrdenCompra.numero_orden == orden_compra_codigo))
    ).first()

    if not buscar_oc:
        datosparalaia.append({
            "descripcion": f"Error: No se encontró la orden de compra '{orden_compra_codigo}' en la base de datos para realizar la validación.",
            "estado": "rechazada"
        })
    if buscar_oc and str(buscar_oc.id_contrato).strip() != str(contrato.id_contrato).strip():
        datosparalaia.append({
            "descripcion": f"Error: La orden de compra '{buscar_oc.numero_orden}' pertenece al contrato '{buscar_oc.id_contrato}', pero la factura reporta el contrato '{contrato.id_contrato}'.",
            "estado": "rechazada"
        })

    nit_contrato_limpio = contrato.proveedor_nit.replace(".", "").strip()
    nit_factura_limpio = buscarfactura.nit_emisor.replace(".", "").strip()

    if nit_contrato_limpio != nit_factura_limpio:
        datosparalaia.append({
            "descripcion": f"Error: El NIT del proveedor en el contrato ({contrato.proveedor_nit}) y el emisor en la factura ({buscarfactura.nit_emisor}) no coinciden.",
            "estado": "rechazada"
        })

    if buscar_oc:
        nit_oc_limpio = buscar_oc.nit_emisor.replace(".", "").strip()
        if nit_oc_limpio != nit_factura_limpio:
            datosparalaia.append({
                "descripcion": f"Error: El NIT del emisor en la orden de compra ({buscar_oc.nit_emisor}) y en la factura ({buscarfactura.nit_emisor}) no coinciden.",
                "estado": "rechazada"
            })
        if nit_oc_limpio != nit_contrato_limpio:
            datosparalaia.append({
                "descripcion": f"Error: El NIT del emisor en la orden de compra ({buscar_oc.nit_emisor}) y en el contrato ({contrato.proveedor_nit}) no coinciden.",
                "estado": "rechazada"
            })
    subtotal_factura = round(float(buscarfactura.subtotal), 2)
    iva_factura = round(float(buscarfactura.iva), 2)
    validariva = round(subtotal_factura * 0.19, 2)

    if validariva != iva_factura:
        datosparalaia.append({
            "descripcion": f"Error matemático: El cálculo del 19% sobre el subtotal de la factura da {validariva}, pero la factura reporta {iva_factura}.",
            "estado": "con errores"
        })

    if buscar_oc:
        subtotal_oc = round(float(buscar_oc.subtotal), 2)
        iva_oc = round(float(buscar_oc.iva), 2)

        if subtotal_factura != subtotal_oc:
            datosparalaia.append({
                "descripcion": f"Error de subtotal: El subtotal de la factura ({subtotal_factura}) no coincide con el subtotal de la orden de compra ({subtotal_oc}).",
                "estado": "con errores"
            })

        if iva_factura != iva_oc:
            datosparalaia.append({
                "descripcion": f"Error de IVA: El IVA de la factura ({iva_factura}) no coincide con el IVA de la orden de compra ({iva_oc}).",
                "estado": "con errores"
            })

    buscaritemsfactura = db.query(ItemsFactura).filter(
        ItemsFactura.id_factura == buscarfactura.cufe
    ).all()

    tarifas_contrato = db.query(Tarifas_Pactadas).filter(
        Tarifas_Pactadas.id_contrato == buscarfactura.id_contrato
    ).all()

    mapa_tarifas = {tarifa.concepto.strip().lower(): float(tarifa.valor_unitario_maximo) for tarifa in tarifas_contrato}

    items_oc = []
    mapa_items_oc = {}
    if buscar_oc:
        items_oc = db.query(ItemOrdenCompra).filter(
            ItemOrdenCompra.orden_id == buscar_oc.id
        ).all()
        mapa_items_oc = {item.descripcion.strip().lower(): item for item in items_oc}

    for f in buscaritemsfactura:
        desc_f = f.descripcion.strip().lower()
        precio_f = round(float(f.precio_unitario), 2)

        # 5.1. Comparación con tarifas pactadas del contrato
        if desc_f not in mapa_tarifas:
            datosparalaia.append({
                "descripcion": f"Error contractual: El ítem '{f.descripcion}' de la factura no se encuentra dentro de las tarifas pactadas del contrato.",
                "estado": "con errores"
            })
        else:
            valor_maximo = mapa_tarifas[desc_f]
            if precio_f > valor_maximo:
                datosparalaia.append({
                    "descripcion": f"Error contractual: El ítem '{f.descripcion}' ({precio_f}) supera el precio máximo de la tarifa pactada en el contrato ({valor_maximo}).",
                    "estado": "requiere revision"
                })

        # 5.2. Comparación de productos con la orden de compra
        if buscar_oc:
            if desc_f not in mapa_items_oc:
                datosparalaia.append({
                    "descripcion": f"Error orden de compra: El ítem '{f.descripcion}' de la factura no existe en la orden de compra '{buscar_oc.numero_orden}'.",
                    "estado": "con errores"
                })
            else:
                item_oc = mapa_items_oc[desc_f]
                precio_oc = round(float(item_oc.precio_unitario), 2)
                if precio_f != precio_oc:
                    datosparalaia.append({
                        "descripcion": f"Error de precio: El precio unitario del ítem '{f.descripcion}' en la factura ({precio_f}) no coincide con el precio de la orden de compra ({precio_oc}).",
                        "estado": "con errores"
                    })
                if f.cantidad != item_oc.cantidad:
                    datosparalaia.append({
                        "descripcion": f"Error de cantidad: La cantidad del ítem '{f.descripcion}' en la factura ({f.cantidad}) no coincide con la cantidad de la orden de compra ({item_oc.cantidad}).",
                        "estado": "con errores"
                    })

    # 5.3. Verificar si la orden de compra tiene productos que no están en la factura
    if buscar_oc:
        descripciones_factura = {f.descripcion.strip().lower() for f in buscaritemsfactura}
        for item_oc in items_oc:
            desc_oc = item_oc.descripcion.strip().lower()
            if desc_oc not in descripciones_factura:
                datosparalaia.append({
                    "descripcion": f"Error orden de compra: El ítem '{item_oc.descripcion}' presente en la orden de compra no fue incluido en la factura.",
                    "estado": "con errores"
                })

    valor_factura = round(float(buscarfactura.total_pagar), 2)

    if buscar_oc:
        total_oc = round(float(buscar_oc.total), 2)
        if valor_factura != total_oc:
            datosparalaia.append({
                "descripcion": f"Error de totales: El valor total de la factura ({valor_factura}) no coincide con el total de la orden de compra ({total_oc}).",
                "estado": "rechazada"
            })

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
        # Para mensual, trimestral, anual: el total de factura, orden de compra y valor_periodo deben ser iguales
        valor_periodo = round(float(contrato.valor_periodo), 2) if contrato.valor_periodo is not None else None
        if valor_periodo is not None:
            if valor_factura != valor_periodo:
                datosparalaia.append({
                    "descripcion": f"Error: La frecuencia del contrato es '{contrato.frecuencia}'. El valor de la factura ({valor_factura}) no coincide con el valor del período ({valor_periodo}). Deben ser iguales.",
                    "estado": "rechazada"
                })
            if buscar_oc and round(float(buscar_oc.total), 2) != valor_periodo:
                datosparalaia.append({
                    "descripcion": f"Error: El total de la orden de compra ({round(float(buscar_oc.total), 2)}) no coincide con el valor del período del contrato ({valor_periodo}).",
                    "estado": "rechazada"
                })

    if not datosparalaia:
        item_exito = {
            "descripcion": "Pasó todas las validaciones de tres vías (Factura, Orden de Compra y Contrato: NITs, ítems, precios, subtotales, IVA y totales) correctamente. La factura es válida.",
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
    """Retorna todas las facturas registradas con su estado actual de causación."""
    return traer_facturas(db)


@router.get("/causaciones/factura/{cufe}")
def obtener_causaciones_por_factura(cufe: str, db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    """Retorna el historial de causaciones y sugerencias asociadas a una factura por su CUFE."""
    return traer_causaciones_por_factura(cufe, db)


@router.get("/contratos")
def obtener_contratos(db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    """Retorna el catálogo completo de contratos vigentes en la base de datos."""
    return traer_contratos(db)


@router.get("/causaciones")
def obtener_causaciones(db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    """Retorna el histórico general de todas las causaciones del sistema."""
    return traer_causaciones(db)