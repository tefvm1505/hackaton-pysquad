from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from config_db import Base

class Causaciones(Base):
    __tablename__ = "causaciones"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    id_factura = Column(String(100), ForeignKey("facturas.cufe"), nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=True)
    estado = Column(String(50), nullable=False)
    sugerencia = Column(Text, nullable=False)
    fecha_causacion = Column(DateTime, server_default=func.now(), nullable=False)