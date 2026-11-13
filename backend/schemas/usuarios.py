from pydantic import BaseModel

class CrearUsuario(BaseModel):
    cedula: int
    nombres: str
    apellidos: str
    telefono: str
    contraseña: str

class LoginUsuario(BaseModel):
    cedula: int
    contraseña: str