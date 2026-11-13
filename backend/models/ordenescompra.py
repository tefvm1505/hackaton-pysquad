"""
Modelos SQLAlchemy para Órdenes de Compra y sus ítems individuales.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from config_db import Base

class EstadoOrdenEnum(str, enum.Enum):
    """Estados del ciclo de vida de una orden de compra."""
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECIBIDA = "RECIBIDA"
    CANCELADA = "CANCELADA"

class OrdenCompra(Base):
    """Entidad Orden de Compra asociada a un contrato y a una factura."""
    __tablename__ = "ordenes_compra"

    id = Column(Integer, primary_key=True, index=True)
    numero_orden = Column(String(50), unique=True, index=True, nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=False)
    fecha_emision = Column(DateTime, default=datetime.utcnow)
    fecha_esperada = Column(DateTime, nullable=True)
    estado = Column(Enum(EstadoOrdenEnum), default=EstadoOrdenEnum.PENDIENTE)
    nit_emisor = Column(String(20), nullable=False)
    subtotal = Column(Numeric(15, 2), default=0.0)
    iva = Column(Numeric(15, 2), default=0.0)
    total = Column(Numeric(15, 2), default=0.0)
    items = relationship("ItemOrdenCompra", back_populates="orden", cascade="all, delete-orphan")

class ItemOrdenCompra(Base):
    """Línea de ítem o producto contenido en una orden de compra."""
    __tablename__ = "items_orden_compra"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_compra.id"), nullable=False)
    descripcion = Column(String(250), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(15, 2), nullable=False)
    total = Column(Numeric(15, 2), nullable=False)
    orden = relationship("OrdenCompra", back_populates="items")
