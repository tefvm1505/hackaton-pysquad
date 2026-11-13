"""
Rutas y controladores para la gestión y consulta de Órdenes de Compra y sus ítems.
"""
from decimal import Decimal
from datetime import datetime, date
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config_db import get_db
from models.ordenescompra import OrdenCompra, ItemOrdenCompra
from services.usuarios import verificar_token

router = APIRouter(tags=["ordenes-compra"])

def _serializar_valor(valor: Any) -> Any:
    """Convierte tipos no primitivos como Decimal, Date o Enum a tipos serializables JSON."""
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if hasattr(valor, "value"):
        return valor.value
    return valor

def _orden_a_dict(orden: OrdenCompra, incluir_conteo: bool = True) -> Dict[str, Any]:
    """Serializa una instancia de OrdenCompra a un diccionario estándar."""
    data = {
        col.name: _serializar_valor(getattr(orden, col.name))
        for col in orden.__table__.columns
    }
    if incluir_conteo:
        data["cantidad_items"] = len(orden.items) if orden.items else 0
    return data

def _item_a_dict(item: ItemOrdenCompra) -> Dict[str, Any]:
    """Serializa una instancia de ItemOrdenCompra a un diccionario estándar."""
    return {
        col.name: _serializar_valor(getattr(item, col.name))
        for col in item.__table__.columns
    }

def _buscar_orden_por_identificador(identificador: str, db: Session) -> OrdenCompra:
    """Busca una orden de compra por su ID primario o por su número de orden único."""
    orden = None
    if identificador.isdigit():
        orden = db.query(OrdenCompra).filter(OrdenCompra.id == int(identificador)).first()
    
    if not orden:
        orden = db.query(OrdenCompra).filter(OrdenCompra.numero_orden == identificador).first()
        
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la orden de compra con identificador: {identificador}"
        )
    return orden

@router.get("/ordenes-compra")
def obtener_ordenes_compra(
    db: Session = Depends(get_db),
    usuario: dict = Depends(verificar_token)
):
    """
    Retorna la lista completa de todas las órdenes de compra registradas en el sistema.
    Requiere autenticación mediante token JWT.
    """
    ordenes = db.query(OrdenCompra).order_by(OrdenCompra.id.desc()).all()
    return [_orden_a_dict(orden) for orden in ordenes]

@router.get("/ordenes-compra/{orden_id}/items")
def obtener_items_orden_compra(
    orden_id: str,
    db: Session = Depends(get_db),
    usuario: dict = Depends(verificar_token)
):
    """
    Retorna los ítems asociados a una orden de compra junto con los atributos detallados de la orden.
    El parámetro orden_id puede ser el ID numérico o el número de orden.
    Requiere autenticación mediante token JWT.
    """
    orden = _buscar_orden_por_identificador(orden_id, db)
    return {
        "orden": _orden_a_dict(orden),
        "items": [_item_a_dict(item) for item in orden.items]
    }

@router.get("/ordenes-compra/{orden_id}")
def obtener_detalle_orden_compra(
    orden_id: str,
    db: Session = Depends(get_db),
    usuario: dict = Depends(verificar_token)
):
    """
    Retorna el detalle completo de una orden de compra incluyendo sus ítems asociados.
    El parámetro orden_id puede ser el ID numérico o el número de orden.
    Requiere autenticación mediante token JWT.
    """
    orden = _buscar_orden_por_identificador(orden_id, db)
    return {
        "orden": _orden_a_dict(orden),
        "items": [_item_a_dict(item) for item in orden.items]
    }

