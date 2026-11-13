"""
Crea un usuario administrador.

El endpoint /crear-usuario está comentado a propósito (cualquiera podría crear admins), así que
en una base de datos nueva se crea el primer usuario con este script:

    docker compose exec backend python crear_admin.py

En local (con el venv activo y el .env del backend):

    python crear_admin.py
"""
import getpass

from fastapi import HTTPException

from config_db import SessionLocal
from schemas.usuarios import CrearUsuario
from services.usuarios import crearusuarios


def main() -> None:
    cedula = int(input("Cédula: ").strip())
    nombres = input("Nombres: ").strip()
    apellidos = input("Apellidos: ").strip()
    telefono = input("Teléfono: ").strip()

    # getpass no muestra lo que se escribe ni lo deja en el historial del terminal.
    contraseña = getpass.getpass("Contraseña: ")
    if not contraseña or contraseña != getpass.getpass("Repite la contraseña: "):
        raise SystemExit("Las contraseñas no coinciden (o están vacías). No se creó nada.")

    db = SessionLocal()
    try:
        data = CrearUsuario(
            cedula=cedula,
            nombres=nombres,
            apellidos=apellidos,
            telefono=telefono,
            contraseña=contraseña,
        )
        print(crearusuarios(data, db))
    except HTTPException as error:
        raise SystemExit(f"No se creó el usuario: {error.detail}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
