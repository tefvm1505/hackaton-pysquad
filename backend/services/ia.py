"""
Servicio de integración con Inteligencia Artificial (Google Gemini):
- Auditor experto: redacta el veredicto formal y sugerencia de causación ante hallazgos de facturación.
- Asistente de análisis de datos: responde preguntas en lenguaje natural sobre contratos, facturas y causaciones.
"""
from google import genai
from google.genai import types
from config import settings
from models.usuarios import Usuarios
from fastapi import HTTPException
import json

client = genai.Client(api_key=settings.api_key)

PROMPT_AGENTE = """Eres un auditor experto en validación contractual y facturación electrónica. Recibirás un objeto JSON o una lista de objetos, donde cada elemento contiene una "descripcion" y un "estado" sobre la revisión de una factura frente a su contrato.

Tu tarea es analizar todos los elementos recibidos y responder de forma formal, concisa y directa siguiendo estrictamente estas reglas:

1. NO uses emojis, iconos ni símbolos decorativos bajo ninguna circunstancia.
2. NO agregues títulos generales, encabezados Markdown (#, ##), saludos, introducciones ni conclusiones al final.
3. Por cada hallazgo recibido en el JSON, utiliza ÚNICAMENTE estas dos etiquetas exactas:

Estado: [El estado correspondiente en mayúsculas, por ejemplo: RECHAZADA, APROBADA, EN REVISIÓN]
Explicación: [Un párrafo breve y claro de máximo 3 a 4 líneas donde expliques qué ocurrió, el motivo de la novedad frente al contrato y la acción concreta recomendada. Si hay múltiples hallazgos, sepáralos únicamente con una línea en blanco.]

4. No inventes cifras, cláusulas ni información que no esté en los datos proporcionados."""

def responder_pregunta(mensaje: list | dict | str):
    """
    Envía los hallazgos de la auditoría a Gemini para generar una explicación formal y estructurada
    con el Estado y la Explicación recomendada para la causación.
    """
    if isinstance(mensaje, (dict, list, tuple)):
        contenido = json.dumps(mensaje, ensure_ascii=False, indent=2, default=str)
    else:
        contenido = str(mensaje)

    respuesta = client.models.generate_content(
        model="gemini-3.5-flash-lite", 
        contents=contenido,
        config=types.GenerateContentConfig(
            system_instruction=PROMPT_AGENTE, 
            temperature=0.2,
            max_output_tokens=1000 
        )
    )
    
    return respuesta.text


PROMPT_ANALISTA_DATOS = """Eres un asistente virtual de análisis de datos para un sistema interno de facturación y contratos.
Recibirás dos cosas:
1. Un "Contexto de datos" en formato JSON, extraído en tiempo real de la base de datos.
2. Una "Pregunta" del usuario.

Tu tarea es responder la pregunta basándote ÚNICAMENTE en el JSON proporcionado.
Reglas estrictas de formato:
- Sé directo y ultra conciso. Ve directo al grano y responde exactamente lo que se te pregunta sin extenderte en explicaciones, contexto innecesario o cálculos de saldos que no se hayan solicitado.
- Escribe SIEMPRE las cantidades, porcentajes y montos de dinero utilizando dígitos numéricos (ej. $150.000.000, 4%, 12 de octubre de 2026) y NUNCA en letras (está prohibido escribir "ciento cincuenta millones" o "cuatro por ciento").
- Escribe en texto plano y continuo. Formula párrafos elegantes, fluidos y bien redactados.
- ESTÁ ESTRICTAMENTE PROHIBIDO usar formato Markdown (NO uses asteriscos ** para negritas, ni numerales #).
- ESTÁ ESTRICTAMENTE PROHIBIDO usar listas, guiones o viñetas. Integra todos los detalles de forma natural dentro de la lectura.
- Si te preguntan algo que no está en los datos, responde amablemente que no tienes esa información.
- No inventes cifras ni asumas estados."""

def consultar_analista_datos(pregunta: str, contexto_db: dict | list) -> str:
    """
    Recibe la pregunta de un usuario y el contexto completo de la base de datos (contratos, facturas, OC),
    y devuelve una respuesta analítica redactada por Gemini.
    """
    datos_str = json.dumps(contexto_db, ensure_ascii=False, indent=2, default=str)
    
    mensaje_estructurado = (
        f"--- CONTEXTO DE DATOS ---\n{datos_str}\n\n"
        f"--- PREGUNTA DEL USUARIO ---\n{pregunta}"
    )
    respuesta = client.models.generate_content(
        model="gemini-3.5-flash-lite", 
        contents=mensaje_estructurado,
        config=types.GenerateContentConfig(
            system_instruction=PROMPT_ANALISTA_DATOS, 
            temperature=0.2,
            max_output_tokens=8192
        )
    )
    
    return respuesta.text