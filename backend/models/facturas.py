from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric
from config_db import Base

class Facturas(Base):
    __tablename__ = "facturas"

    cufe = Column(String(100), primary_key=True, index=True)
    emisor = Column(String(200), nullable=False)
    nit_emisor = Column(String(20), nullable=False)
    numero_factura = Column(String(100), nullable=False)
    fecha_emision = Column(Date, nullable=False)
    fecha_vencimiento = Column(Date, nullable=False)
    cliente = Column(String(250), nullable=False)
    nit_cliente = Column(String(20), nullable=False)
    orden_compra = Column(String(100), nullable=False)
    moneda = Column(String(10), nullable=False)
    subtotal = Column(Numeric(15,2), nullable=False)
    iva = Column(Numeric(15,2), nullable=False)
    total_pagar = Column(Numeric(15,2), nullable=False)
    id_contrato = Column(String(100), ForeignKey("contratos.id_contrato"), nullable=False)


class ItemsFactura(Base):
    __tablename__ = "itemsfactura"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    descripcion = Column(String(250), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(15,2), nullable=False)
    total = Column(Numeric(15,2), nullable=False)
    id_factura = Column(String(100), ForeignKey("facturas.cufe"), nullable=False)