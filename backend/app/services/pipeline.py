import logging
import unicodedata
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import select

from ..config import settings
from ..database import SessionLocal
from ..models import CATEGORIES, Recipe
from . import ai, downloader, media

logger = logging.getLogger(__name__)

# Máximo 2 videos procesándose a la vez para no saturar el miniPC
executor = ThreadPoolExecutor(max_workers=2)
# Tareas ligeras (solo texto): nutrición, menús, listas
light_executor = ThreadPoolExecutor(max_workers=2)


def normalize_text(text: str) -> str:
    """Minúsculas y sin acentos, para búsquedas tolerantes."""
    text = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def build_search_text(recipe: Recipe) -> str:
    parts = [recipe.title, recipe.description, recipe.category]
    parts.extend(recipe.tags or [])
    for ing in recipe.ingredients or []:
        parts.append(ing.get("nombre", ""))
    for step in recipe.steps or []:
        parts.append(step.get("texto", ""))
    return normalize_text(" ".join(p for p in parts if p))


def enqueue_processing(recipe_id: str) -> None:
    executor.submit(_process_recipe, recipe_id)


def enqueue_nutrition(recipe_id: str) -> None:
    light_executor.submit(_compute_nutrition_job, recipe_id)


def enqueue_missing_nutrition() -> int:
    """Al arrancar: calcula la nutrición de las recetas listas que aún no la tienen."""
    db = SessionLocal()
    try:
        recipes = db.scalars(
            select(Recipe).where(Recipe.status == "ready", Recipe.nutrition.is_(None))
        ).all()
        for recipe in recipes:
            recipe.nutrition_status = "pending"
        db.commit()
        for recipe in recipes:
            enqueue_nutrition(recipe.id)
        return len(recipes)
    finally:
        db.close()


def _as_int(value):
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _normalize_difficulty(value) -> str | None:
    difficulty = str(value or "").lower().strip()
    mapping = {"facil": "fácil", "fácil": "fácil", "media": "media", "dificil": "difícil", "difícil": "difícil"}
    return mapping.get(difficulty)


def _clean_ingredients(raw) -> list[dict]:
    ingredients = []
    for ing in raw or []:
        if isinstance(ing, dict) and ing.get("nombre"):
            ingredients.append({
                "cantidad": str(ing.get("cantidad") or ""),
                "nombre": str(ing["nombre"]),
                "notas": str(ing.get("notas") or ""),
                "grupo": str(ing.get("grupo") or ""),
            })
    return ingredients


def _clean_steps(raw) -> list[dict]:
    steps = []
    for i, step in enumerate(raw or []):
        if isinstance(step, dict) and step.get("texto"):
            steps.append({
                "orden": i + 1,
                "texto": str(step["texto"]),
                "grupo": str(step.get("grupo") or ""),
            })
    return steps


def apply_recipe_data(recipe: Recipe, data: dict) -> None:
    """Vuelca en la receta un dict con la estructura que devuelve Gemini."""
    recipe.title = str(data.get("titulo") or "Receta sin título")
    recipe.description = str(data.get("descripcion") or "")
    category = data.get("categoria")
    recipe.category = category if category in CATEGORIES else "Otros"
    recipe.tags = [str(t) for t in (data.get("etiquetas") or [])][:8]
    recipe.servings = data.get("raciones") or None

    recipe.prep_time_min = _as_int(data.get("tiempo_preparacion_min"))
    recipe.cook_time_min = _as_int(data.get("tiempo_coccion_min"))
    recipe.total_time_min = _as_int(data.get("tiempo_total_min"))
    if recipe.total_time_min is None and (recipe.prep_time_min or recipe.cook_time_min):
        recipe.total_time_min = (recipe.prep_time_min or 0) + (recipe.cook_time_min or 0)

    recipe.difficulty = _normalize_difficulty(data.get("dificultad"))
    recipe.ingredients = _clean_ingredients(data.get("ingredientes"))
    recipe.steps = _clean_steps(data.get("pasos"))
    recipe.tips = [str(t) for t in (data.get("consejos") or [])]
    recipe.search_text = build_search_text(recipe)


def recipe_to_nutrition_payload(recipe: Recipe) -> dict:
    return {
        "titulo": recipe.title,
        "raciones": recipe.servings or "no indicado",
        "ingredientes": [
            {"cantidad": i.get("cantidad", ""), "nombre": i.get("nombre", ""), "notas": i.get("notas", "")}
            for i in (recipe.ingredients or [])
        ],
    }


def compute_nutrition_sync(db, recipe: Recipe) -> None:
    """Calcula y guarda la nutrición de una receta (bloqueante)."""
    recipe.nutrition_status = "processing"
    db.commit()
    try:
        recipe.nutrition = ai.compute_nutrition(recipe_to_nutrition_payload(recipe))
        recipe.nutrition_status = "ready"
    except Exception:
        # Se conserva la nutrición anterior si existía; el estado indica el fallo
        logger.exception("Error calculando nutrición de %s", recipe.id)
        recipe.nutrition_status = "error"
    db.commit()


def _compute_nutrition_job(recipe_id: str) -> None:
    db = SessionLocal()
    try:
        recipe = db.get(Recipe, recipe_id)
        if recipe is None or recipe.status != "ready":
            return
        compute_nutrition_sync(db, recipe)
    finally:
        db.close()


def _process_recipe(recipe_id: str) -> None:
    db = SessionLocal()
    try:
        recipe = db.get(Recipe, recipe_id)
        if recipe is None:
            return
        recipe.status = "processing"
        recipe.error_message = None
        db.commit()

        try:
            # 1. Conseguir el video (descarga o ya subido)
            if recipe.video_filename:
                video_path = settings.videos_dir / recipe.video_filename
            else:
                video_path = downloader.download_video(recipe.source_url, settings.videos_dir, recipe.id)
                recipe.video_filename = video_path.name
                db.commit()

            # 2. Miniatura y fotogramas
            if not recipe.thumbnail_filename:
                recipe.thumbnail_filename = media.extract_thumbnail(video_path, settings.images_dir, recipe.id)
            if not recipe.frames:
                recipe.frames = media.extract_frames(video_path, settings.images_dir, recipe.id)
            db.commit()

            # 3. Extracción de la receta con Gemini
            data = ai.extract_recipe_from_video(video_path)
            apply_recipe_data(recipe, data)
            recipe.status = "ready"
            db.commit()

            # 4. Valores nutricionales
            compute_nutrition_sync(db, recipe)
        except Exception as exc:
            logger.exception("Error procesando la receta %s", recipe_id)
            db.rollback()
            recipe = db.get(Recipe, recipe_id)
            if recipe is not None:
                recipe.status = "error"
                recipe.error_message = str(exc)[:1000]
                db.commit()
    finally:
        db.close()
