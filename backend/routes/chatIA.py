from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config_db import get_db
from services.ia import consultar_analista_datos
from models.contratos import Contratos, Tarifas_Pactadas
from models.facturas import Facturas, ItemsFactura
from models.causacion import Causaciones
from schemas.chatIA import Chatear
from services.usuarios import verificar_token

router = APIRouter()

def fila_a_dict(fila):
    return {columna.name: getattr(fila, columna.name) for columna in fila.__table__.columns}


@router.post("/chatIA")
def Chat_IA(datos: Chatear, db: Session = Depends(get_db), usuario: dict = Depends(verificar_token)):
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

    return consultar_analista_datos(datos.pregunta, datoscompletos)