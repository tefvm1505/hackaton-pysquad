"""
Punto de entrada principal de la aplicación FastAPI.
Configura middlewares (CORS), registra los enrutadores de la API y expone chequeos de salud.
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routes.usuarios import router as router_usuarios
from routes.facturas import router as router_factura
from routes.chatIA import router as router_IA

app = FastAPI(
    title="Facto API - Backend",
    description="API para auditoría, validación contractual de tres vías y causación de facturas.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de enrutadores
app.include_router(router_usuarios)
app.include_router(router_factura)
app.include_router(router_IA)

@app.get("/heald")
def Heald():
    """Endpoint de verificación de estado y salud del servidor."""
    return "servidor activo"
