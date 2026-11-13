from pydantic import BaseModel

class Chatear(BaseModel):
    pregunta: str
    cedula: int