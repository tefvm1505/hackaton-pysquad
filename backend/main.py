from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routes.usuarios import router as router_usuarios
from routes.facturas import router as router_factura
from routes.chatIA import router as router_IA

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router_usuarios)
app.include_router(router_factura)
app.include_router(router_IA)

@app.get("/heald")
def Heald():
    return "servidor activo"
