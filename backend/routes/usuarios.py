from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config_db import get_db
from services.usuarios import crearusuarios, verificariniciosesion
from schemas.usuarios import CrearUsuario, LoginUsuario

router = APIRouter()

#para crear un admin hay que quitarle el comentado a esto
# @router.post("/crear-usuario")
# def Crear_Usuario(data: CrearUsuario, db: Session = Depends(get_db)):
#     return crearusuarios(data, db)

@router.post("/login")
def Login(data: LoginUsuario, db: Session = Depends(get_db)):
    return verificariniciosesion(data, db)
