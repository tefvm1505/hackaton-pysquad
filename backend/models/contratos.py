from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric
from config_db import Base

class Contratos(Base):
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
    __tablename__ = "tarifaspactadas"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    concepto = Column(String(100), nullable=False)
    valor_unitario_maximo = Column(Numeric(15,2), nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=False)


class Conceptos_Cubiertos(Base):
    __tablename__ = "conceptoscubiertos"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    descripcion = Column(String(100), nullable=False)
    id_contrato = Column(String(200), ForeignKey("contratos.id_contrato"), nullable=False)

    