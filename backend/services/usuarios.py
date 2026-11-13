from passlib.context import CryptContext
from models.usuarios import Usuarios
import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from config import settings

security = HTTPBearer()

def crearusuarios(data, db):
    buscarusuario = db.query(Usuarios).filter(
        Usuarios.cedula == data.cedula
    ).first()

    if buscarusuario:
        raise HTTPException(status_code=400, detail="error el usuario ya existe")
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    contraseñahasheada = pwd_context.hash(data.contraseña)

    nuevousuario = Usuarios(
        cedula = data.cedula,
        nombres = data.nombres,
        apellidos = data.apellidos,
        telefono = data.telefono,
        rol = "admin",
        contraseña = contraseñahasheada
    )

    db.add(nuevousuario)
    db.commit()

    return "usuario creado con exito"

def create_access_token(rol, user_id: int, expires_minutes: int = 60) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),  
        "iat": now, 
        "exp": now + timedelta(minutes=expires_minutes), 
        "rol": rol
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def verificar_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido: no contiene el usuario")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def verificariniciosesion(data, db):
    buscarusuario = db.query(Usuarios).filter(
        Usuarios.cedula == data.cedula
    ).first()

    if not buscarusuario:
        raise HTTPException(status_code=404, detail="no se encontro el usuario")

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    validarcontraseña = pwd_context.verify(data.contraseña, buscarusuario.contraseña)

    if not validarcontraseña:
        raise HTTPException(status_code=401, detail="contraseña incorrecta")

    return create_access_token(buscarusuario.rol, buscarusuario.cedula, 60)
    