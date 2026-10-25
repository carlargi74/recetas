import secrets
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import CATEGORIES, Recipe, User
from ..schemas import RecipeCreateFromUrl, RecipeOut, RecipeSummary, RecipeUpdate, ShareResponse
from ..services.pipeline import build_search_text, enqueue_nutrition, enqueue_processing, normalize_text

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}


@router.get("/categories")
def list_categories(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    counts = dict(
        db.execute(
            select(Recipe.category, func.count()).where(Recipe.status == "ready").group_by(Recipe.category)
        ).all()
    )
    return [{"name": c, "count": counts.get(c, 0)} for c in CATEGORIES]


@router.get("", response_model=list[RecipeSummary])
def list_recipes(
    q: str = "",
    category: str = "",
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Recipe).order_by(Recipe.created_at.desc())
    if category:
        query = query.where(Recipe.category == category)
    for token in normalize_text(q).split():
        query = query.where(Recipe.search_text.like(f"%{token}%"))
    return db.scalars(query).all()


@router.post("/from-url", response_model=RecipeSummary)
def create_from_url(
    body: RecipeCreateFromUrl,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="La URL no es válida")
    recipe = Recipe(source_url=url, source_type="url", title="Procesando...", created_by=user.id)
    db.add(recipe)
    db.commit()
    enqueue_processing(recipe.id)
    return recipe


@router.post("/upload", response_model=RecipeSummary)
def create_from_upload(
    file: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    extension = Path(file.filename or "video.mp4").suffix.lower()
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato no soportado: {extension}")

    recipe = Recipe(source_type="upload", title="Procesando...", created_by=user.id)
    db.add(recipe)
    db.commit()

    video_path = settings.videos_dir / f"{recipe.id}{extension}"
    with video_path.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    recipe.video_filename = video_path.name
    db.commit()

    enqueue_processing(recipe.id)
    return recipe


@router.get("/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return recipe


@router.patch("/{recipe_id}", response_model=RecipeOut)
def update_recipe(
    recipe_id: str,
    body: RecipeUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    updates = body.model_dump(exclude_unset=True)
    if "category" in updates and updates["category"] not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Categoría no válida")
    for field, value in updates.items():
        setattr(recipe, field, value)
    recipe.search_text = build_search_text(recipe)

    # Si cambian ingredientes o raciones, la nutrición debe recalcularse
    if recipe.status == "ready" and ("ingredients" in updates or "servings" in updates):
        recipe.nutrition_status = "pending"
        db.commit()
        enqueue_nutrition(recipe.id)
    else:
        db.commit()
    return recipe


@router.delete("/{recipe_id}")
def delete_recipe(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    if recipe.video_filename:
        (settings.videos_dir / recipe.video_filename).unlink(missing_ok=True)
    if recipe.thumbnail_filename:
        (settings.images_dir / recipe.thumbnail_filename).unlink(missing_ok=True)
    for frame in recipe.frames or []:
        (settings.images_dir / frame).unlink(missing_ok=True)

    db.delete(recipe)
    db.commit()
    return {"ok": True}


@router.post("/{recipe_id}/retry", response_model=RecipeSummary)
def retry_recipe(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    if recipe.status == "processing":
        raise HTTPException(status_code=409, detail="La receta ya se está procesando")
    if recipe.source_type == "ai":
        raise HTTPException(status_code=400, detail="Las recetas creadas por la IA no tienen video que reprocesar")
    recipe.status = "pending"
    recipe.error_message = None
    db.commit()
    enqueue_processing(recipe.id)
    return recipe


@router.post("/{recipe_id}/nutrition", response_model=RecipeOut)
def recompute_nutrition(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    if recipe.status != "ready":
        raise HTTPException(status_code=409, detail="La receta aún no está lista")
    if recipe.nutrition_status == "processing":
        raise HTTPException(status_code=409, detail="La nutrición ya se está calculando")
    recipe.nutrition_status = "pending"
    db.commit()
    enqueue_nutrition(recipe.id)
    return recipe


@router.post("/{recipe_id}/share", response_model=ShareResponse)
def enable_share(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    if not recipe.share_token:
        recipe.share_token = secrets.token_urlsafe(16)
        db.commit()
    return ShareResponse(share_token=recipe.share_token)


@router.delete("/{recipe_id}/share", response_model=ShareResponse)
def disable_share(recipe_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    recipe = db.get(Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    recipe.share_token = None
    db.commit()
    return ShareResponse(share_token=None)
