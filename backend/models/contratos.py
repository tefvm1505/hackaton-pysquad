"""
Modelos SQLAlchemy para Contratos, Tarifas Pactadas y Conceptos Cubiertos.
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric
from config_db import Base

class Contratos(Base):
    """Representa el marco contractual con un proveedor (montos, vigencia, periodicidad y centro de costos)."""
    __tablename__ = "contratos"

    id_contrato = Column(String(200), primary_key=True, autoincrement=False, index=True)
    proveedor_id = Column(String(20), nullable=False)
    proveedor_nit = Column(String(20), nullable=False)
    objeto = Column(String(250), nullable=False)
    vigencia_inicio = Column(Date, nullable=False)
    vigencia_fin = Column(Date, nullable=False)
    valor_total = Column(Numeric(15,2), nullable=False)
    valor_periodo = Column(Numeric(15,2), nullable=True)
    frecuencia = Column(String(50), nullable=False)
    centro_costo= Column(String(50), nullable=False)
    estado = Column(String(20), default="activo", nullable=True)

class Tarifas_Pactadas(Base):
    """Tarifas y precios máximos acordados en el contrato para cada concepto o ítem."""
    __tablename__ = "tarifaspactadas"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    concepto = Column(String(100), nullable=False)
    valor_unitario_maximo = Column(Numeric(15,2), nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=False)


class Conceptos_Cubiertos(Base):
    """Conceptos o rubros cubiertos autorizados por el contrato."""
    __tablename__ = "conceptoscubiertos"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    descripcion = Column(String(100), nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=False)

    