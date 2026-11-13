"""
Rutas para la gestión y autenticación de usuarios.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config_db import get_db
from services.usuarios import crearusuarios, verificariniciosesion
from schemas.usuarios import CrearUsuario, LoginUsuario

router = APIRouter()

#para crear un admin hay que quitarle el comentado a esto
# @router.post("/crear-usuario")
# def Crear_Usuario(data: CrearUsuario, db: Session = Depends(get_db)):
#     """Endpoint administrativo para registrar nuevos usuarios con rol admin."""
#     return crearusuarios(data, db)

@router.post("/login")
def Login(data: LoginUsuario, db: Session = Depends(get_db)):
    """
    Inicia sesión validando cédula y contraseña.
    Retorna el token JWT para autorizar las demás peticiones.
    """
    return verificariniciosesion(data, db)
