"""
Modelo SQLAlchemy para la gestión y autenticación de usuarios del sistema.
"""
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from config_db import Base
from datetime import datetime

class Usuarios(Base):
    """Representa a los usuarios del backoffice (con rol y credenciales cifradas)."""
    __tablename__ = "usuarios"

    cedula = Column(Integer, primary_key=True, autoincrement=False, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=False)
    rol = Column(String(50), nullable=False)
    contraseña = Column(String(255), nullable=False)