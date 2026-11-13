"""
Rutas para el asistente conversacional de inteligencia artificial (Chat IA).
Permite a los usuarios realizar consultas en lenguaje natural sobre contratos, facturas, OC y causaciones.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config_db import get_db
from services.ia import consultar_analista_datos
from models.contratos import Contratos, Tarifas_Pactadas
from models.facturas import Facturas, ItemsFactura
from models.causacion import Causaciones
from models.ordenescompra import OrdenCompra
from schemas.chatIA import Chatear
from services.usuarios import verificar_token

router = APIRouter()

def fila_a_dict(fila):
    """Serializa una fila SQLAlchemy a diccionario."""
    return {columna.name: getattr(fila, columna.name) for columna in fila.__table__.columns}


@router.post("/chatIA")
def Chat_IA(datos: Chatear, db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
    """
    Recopila el estado completo de la base de datos (contratos, tarifas, facturas, ítems, causaciones y OC)
    y lo envía como contexto a Gemini para responder la consulta del usuario.
    """
    datoscompletos = []
    
    traerdatoscontratos = [fila_a_dict(c) for c in db.query(Contratos).all()]
    datoscompletos.append({"contratos": traerdatoscontratos})
    
    traerdatostarifas = [fila_a_dict(t) for t in db.query(Tarifas_Pactadas).all()]
    datoscompletos.append({"tarifas_contratos": traerdatostarifas})
    
    traerdatosfacturas = [fila_a_dict(f) for f in db.query(Facturas).all()]
    datoscompletos.append({"facturas": traerdatosfacturas})
    
    traerdatositemsfacturas = [fila_a_dict(i) for i in db.query(ItemsFactura).all()]
    datoscompletos.append({"items_facturas": traerdatositemsfacturas})

    traerdatoscausaciones = [fila_a_dict(i) for i in db.query(Causaciones).all()]
    datoscompletos.append({"causaciones": traerdatoscausaciones})

    traerdatosoc = [fila_a_dict(o) for o in db.query(OrdenCompra).all()]
    datoscompletos.append({"ordenes_compra": traerdatosoc})

    return consultar_analista_datos(datos.pregunta, datoscompletos)