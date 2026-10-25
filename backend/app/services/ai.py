import json
import time
from pathlib import Path

from google import genai

from ..config import settings
from ..models import CATEGORIES

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------


def _client() -> genai.Client:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY no está configurada en el archivo .env")
    return genai.Client(api_key=settings.gemini_api_key)


def _parse_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1:
            raise RuntimeError(f"Gemini devolvió una respuesta no válida: {text[:200]}")
        return json.loads(text[start : end + 1])


def _generate_json(contents, temperature: float = 0.2) -> dict:
    client = _client()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config={"response_mime_type": "application/json", "temperature": temperature},
    )
    return _parse_json(response.text or "")


# ---------------------------------------------------------------------------
# Extracción de receta desde video
# ---------------------------------------------------------------------------

RECIPE_PROMPT = f"""Eres un asistente experto en cocina. Analiza este video de una receta
(imagen, audio y texto en pantalla) y extrae toda la información de la receta.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:

{{
  "es_receta": true,
  "titulo": "nombre corto y descriptivo del plato",
  "descripcion": "descripción apetitosa de 1-3 frases del plato",
  "categoria": "una de las categorías permitidas",
  "etiquetas": ["etiqueta1", "etiqueta2"],
  "raciones": "ej. '4 personas' o null si no se menciona",
  "tiempo_preparacion_min": 15,
  "tiempo_coccion_min": 30,
  "tiempo_total_min": 45,
  "dificultad": "fácil, media o difícil",
  "ingredientes": [
    {{"cantidad": "200 g", "nombre": "harina", "notas": "tamizada", "grupo": "Para el bizcocho"}}
  ],
  "pasos": [
    {{"orden": 1, "texto": "descripción clara y completa del paso", "grupo": "Para el bizcocho"}}
  ],
  "consejos": ["consejo o truco mencionado en el video"]
}}

Reglas:
- TODO el texto debe estar en español. Si el video está en otro idioma, traduce.
- "categoria" debe ser exactamente una de: {json.dumps(CATEGORIES, ensure_ascii=False)}
- "grupo": si la receta tiene componentes diferenciados (ej. la masa, el relleno, la
  cobertura, la salsa, la guarnición), asigna a cada ingrediente y a cada paso el nombre
  de su componente (ej. "Para la masa", "Para la salsa"). Usa exactamente los mismos
  nombres de grupo en ingredientes y pasos. Si la receta es de un solo componente,
  deja "grupo" como cadena vacía en todos.
- Si una cantidad no se menciona, deja "cantidad" como cadena vacía y añade en "notas" "al gusto" si procede.
- Los pasos deben ser autosuficientes: alguien debe poder cocinar la receta sin ver el video.
- Incluye temperaturas, tiempos y técnicas que se mencionen o se vean.
- Si el video NO es una receta de cocina, responde {{"es_receta": false}} y nada más.
- Los tiempos son números enteros en minutos, o null si no se pueden estimar.
- "etiquetas": 3-6 etiquetas útiles en minúsculas (ej. "pollo", "al horno", "sin gluten", "rápido").
"""


def extract_recipe_from_video(video_path: Path) -> dict:
    """Sube el video a Gemini y devuelve la receta extraída como dict."""
    client = _client()

    uploaded = client.files.upload(file=str(video_path))
    try:
        deadline = time.time() + 300
        while uploaded.state and uploaded.state.name == "PROCESSING":
            if time.time() > deadline:
                raise RuntimeError("Gemini tardó demasiado en procesar el video")
            time.sleep(3)
            uploaded = client.files.get(name=uploaded.name)
        if uploaded.state and uploaded.state.name == "FAILED":
            raise RuntimeError("Gemini no pudo procesar el archivo de video")

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[uploaded, RECIPE_PROMPT],
            config={"response_mime_type": "application/json", "temperature": 0.2},
        )
        text = response.text or ""
    finally:
        try:
            client.files.delete(name=uploaded.name)
        except Exception:
            pass

    data = _parse_json(text)
    if not data.get("es_receta", True):
        raise RuntimeError("El video no parece ser una receta de cocina")
    return data


# ---------------------------------------------------------------------------
# Valores nutricionales
# ---------------------------------------------------------------------------

NUTRITION_KEYS = [
    "calorias_kcal", "proteinas_g", "hidratos_g", "azucares_g", "grasas_g",
    "grasas_saturadas_g", "fibra_g", "sal_g", "colesterol_mg",
]
VITAMIN_KEYS = ["A_ug", "C_mg", "D_ug", "E_mg", "B12_ug", "B9_folato_ug"]
MINERAL_KEYS = ["calcio_mg", "hierro_mg", "magnesio_mg", "potasio_mg", "zinc_mg", "sodio_mg"]


def compute_nutrition(recipe: dict) -> dict:
    """Estima los valores nutricionales por ración a partir de los ingredientes."""
    prompt = f"""Eres un nutricionista. Estima los valores nutricionales POR RACIÓN de esta receta
a partir de sus ingredientes y cantidades. Si una cantidad falta, asume una cantidad típica.

Receta:
{json.dumps(recipe, ensure_ascii=False)}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (números, sin unidades
en los valores; usa null si un valor es realmente imposible de estimar):

{{
  "raciones_consideradas": 4,
  "calorias_kcal": 0, "proteinas_g": 0, "hidratos_g": 0, "azucares_g": 0, "grasas_g": 0,
  "grasas_saturadas_g": 0, "fibra_g": 0, "sal_g": 0, "colesterol_mg": 0,
  "vitaminas": {{"A_ug": 0, "C_mg": 0, "D_ug": 0, "E_mg": 0, "B12_ug": 0, "B9_folato_ug": 0}},
  "minerales": {{"calcio_mg": 0, "hierro_mg": 0, "magnesio_mg": 0, "potasio_mg": 0, "zinc_mg": 0, "sodio_mg": 0}},
  "notas": "una frase breve sobre el perfil nutricional del plato (en español)"
}}

Reglas:
- "raciones_consideradas": número de raciones que has usado para dividir el total. Usa las
  raciones indicadas en la receta; si no se indican, estima un número razonable.
- Todos los valores son por una ración.
- Redondea a un decimal como máximo.
"""
    data = _generate_json(prompt)
    data["por"] = "ración"
    return data


# ---------------------------------------------------------------------------
# Lista de la compra
# ---------------------------------------------------------------------------


def generate_shopping_list(recipes: list[dict]) -> dict:
    """Consolida ingredientes de varias recetas en una lista escalada.

    Cada receta trae: titulo, raciones_originales, comensales, veces, ingredientes.
    """
    prompt = f"""Eres un asistente de cocina. Genera la lista de la compra consolidada para
preparar estas recetas. Cada receta indica para cuántos "comensales" hay que prepararla y
cuántas "veces" se cocina en el periodo.

Recetas:
{json.dumps(recipes, ensure_ascii=False)}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:

{{
  "secciones": [
    {{
      "nombre": "Frutas y verduras",
      "items": [
        {{"cantidad": "1,5 kg", "nombre": "tomates", "recetas": ["Ensalada de tomate"]}}
      ]
    }}
  ]
}}

Reglas:
- Para cada receta, escala las cantidades desde sus raciones originales a los comensales
  indicados y multiplícalas por las veces que se cocina. Si una receta no indica raciones
  originales, asume que es para 4.
- Suma los ingredientes repetidos entre recetas, unificando unidades (ej. gramos y tazas).
- Redondea a cantidades prácticas de compra (ej. "2 cebollas" en vez de "1,7 cebollas",
  "1 brick de 500 ml" en vez de "430 ml").
- Agrupa por secciones típicas del supermercado: "Frutas y verduras", "Carnicería",
  "Pescadería", "Lácteos y huevos", "Despensa", "Panadería", "Congelados", "Bebidas",
  "Especias y condimentos". Incluye solo las secciones con algún ingrediente.
- En "recetas" indica en qué recetas se usa cada ingrediente.
- Todo en español.
"""
    data = _generate_json(prompt)
    if not isinstance(data.get("secciones"), list):
        raise RuntimeError("Gemini no devolvió la lista de la compra esperada")
    return data


# ---------------------------------------------------------------------------
# Menús personalizados
# ---------------------------------------------------------------------------


def generate_menu_chunk(
    *,
    title: str,
    goal: str,
    instructions: str,
    dates: list[str],
    meals: list[str],
    people: list[dict],
    guests_count: int,
    guests_notes: str,
    catalog: list[dict],
    used_titles: list[str],
    is_first_chunk: bool,
) -> dict:
    """Genera el plan de comidas para un tramo de días."""
    prompt = f"""Eres un nutricionista y cocinero experto. Diseña un menú personalizado.

DATOS DEL MENÚ
- Título: {title}
- Objetivo principal: {goal or "comer variado y saludable"}
- Indicaciones del usuario: {instructions or "ninguna"}
- Días a planificar en este tramo (formato AAAA-MM-DD): {json.dumps(dates)}
- Comidas de cada día que hay que planificar: {json.dumps(meals)}
- Invitados adicionales sin perfil: {guests_count} ({guests_notes or "sin detalles"})

PERSONAS (el menú es COMÚN para todas: se cocina lo mismo, ajustando raciones por persona)
{json.dumps(people, ensure_ascii=False, indent=1)}

RECETAS DISPONIBLES EN EL RECETARIO (usa su "id" cuando encajen; "kcal_racion" puede ser null)
{json.dumps(catalog, ensure_ascii=False)}

PLATOS YA USADOS EN DÍAS ANTERIORES DE ESTE MENÚ (evita repetirlos salvo que sea razonable)
{json.dumps(used_titles, ensure_ascii=False)}

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:

{{
  "resumen": "2-4 frases explicando el enfoque del menú para este objetivo y estas personas",
  "personas": [
    {{"profile_id": "id del perfil", "kcal_dia": 1900, "indicaciones": "raciones y ajustes para esta persona"}}
  ],
  "nuevas_recetas": [
    {{
      "ref": "nueva-1",
      "titulo": "...", "descripcion": "...", "categoria": "una de las permitidas",
      "etiquetas": ["..."], "raciones": "4 personas", "tiempo_total_min": 30,
      "dificultad": "fácil",
      "ingredientes": [{{"cantidad": "200 g", "nombre": "...", "notas": "", "grupo": ""}}],
      "pasos": [{{"orden": 1, "texto": "...", "grupo": ""}}]
    }}
  ],
  "dias": [
    {{
      "fecha": "AAAA-MM-DD",
      "comidas": [
        {{
          "tipo": "comida",
          "platos": [
            {{"receta": "id del recetario o ref de nueva receta", "nota": "ej. Ana: 1 ración, Juan: ración y media"}}
          ],
          "nota": "comentario breve opcional de la comida"
        }}
      ]
    }}
  ]
}}

Reglas:
- Debes incluir TODOS los días indicados y, en cada día, TODAS las comidas indicadas, en ese orden.
- PRIORIZA las recetas del recetario cuando encajen con el objetivo y las personas. Solo crea
  "nuevas_recetas" cuando no haya nada adecuado (muy habitual en desayunos, almuerzos y
  meriendas). Cada nueva receta debe ser completa y realista, con ingredientes con cantidades
  y pasos claros, y puede reutilizarse en varios días referenciando su "ref".
- "categoria" de las nuevas recetas debe ser exactamente una de: {json.dumps(CATEGORIES, ensure_ascii=False)}
- Respeta estrictamente alergias, intolerancias, datos médicos y preferencias de TODAS las personas.
- Ten en cuenta edad, sexo, altura, peso y actividad para calcular las kcal/día de cada
  persona según el objetivo (déficit moderado para bajar peso, superávit y más proteína para
  ganar músculo, equilibrio para cuidar la salud), e indícalo en "personas".
- En "nota" de cada plato indica las raciones por persona cuando difieran; si una persona
  necesita una variante (ej. sin gluten, sin lácteos), indícalo ahí.
- Para menús de celebración (ej. cena de Navidad) incluye varios platos por comida
  (entrante, principal, postre) acordes a la ocasión.
- Varía: no repitas el mismo plato principal en días consecutivos.
- {"Rellena 'personas' y 'resumen' con detalle." if is_first_chunk else "En este tramo 'personas' y 'resumen' pueden ir vacíos (ya se rellenaron antes)."}
- Todo en español.
"""
    data = _generate_json(prompt, temperature=0.5)
    if not isinstance(data.get("dias"), list):
        raise RuntimeError("Gemini no devolvió el plan de menú esperado")
    return data
