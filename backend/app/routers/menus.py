import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import MEAL_TYPES, Menu, Profile, Recipe, User
from ..schemas import MenuCreate, MenuOut, MenuRecipeRef, MenuSummary, ProfileOut, ShareResponse
from ..services.menus import enqueue_menu_generation

router = APIRouter(prefix="/api/menus", tags=["menus"])

MAX_DAYS = 92


def menu_to_out(db: Session, menu: Menu) -> MenuOut:
    out = MenuOut.model_validate(menu, from_attributes=True)

    recipe_ids = {
        dish["recipe_id"]
        for day in (menu.plan or {}).get("dias", [])
        for meal in day.get("comidas", [])
        for dish in meal.get("platos", [])
        if dish.get("recipe_id")
    }
    if recipe_ids:
        recipes = db.scalars(select(Recipe).where(Recipe.id.in_(recipe_ids))).all()
        out.recipes = {
            r.id: MenuRecipeRef(
                id=r.id,
                title=r.title,
                thumbnail_filename=r.thumbnail_filename,
                kcal_per_serving=r.kcal_per_serving,
                share_token=r.share_token,
                category=r.category,
            )
            for r in recipes
        }
    if menu.profile_ids:
        profiles = db.scalars(select(Profile).where(Profile.id.in_(menu.profile_ids))).all()
        out.profiles = [ProfileOut.model_validate(p, from_attributes=True) for p in profiles]
    return out


@router.get("", response_model=list[MenuSummary])
def list_menus(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.scalars(select(Menu).order_by(Menu.created_at.desc())).all()


@router.post("", response_model=MenuSummary)
def create_menu(body: MenuCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")
    if (body.end_date - body.start_date).days + 1 > MAX_DAYS:
        raise HTTPException(status_code=400, detail=f"El menú no puede superar {MAX_DAYS} días")
    meals = [m for m in MEAL_TYPES if m in body.meals]
    if not meals:
        raise HTTPException(status_code=400, detail="Selecciona al menos una comida del día")
    if body.profile_ids:
        found = set(db.scalars(select(Profile.id).where(Profile.id.in_(body.profile_ids))).all())
        missing = [p for p in body.profile_ids if p not in found]
        if missing:
            raise HTTPException(status_code=400, detail="Alguno de los perfiles no existe")
    if not body.profile_ids and body.guests_count == 0:
        raise HTTPException(status_code=400, detail="Indica al menos una persona o invitado")

    menu = Menu(
        title=body.title.strip(),
        goal=body.goal.strip(),
        instructions=body.instructions.strip(),
        start_date=body.start_date,
        end_date=body.end_date,
        meals=meals,
        profile_ids=body.profile_ids,
        guests_count=body.guests_count,
        guests_notes=body.guests_notes.strip(),
        created_by=user.id,
    )
    db.add(menu)
    db.commit()
    enqueue_menu_generation(menu.id)
    return menu


@router.get("/{menu_id}", response_model=MenuOut)
def get_menu(menu_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    return menu_to_out(db, menu)


@router.delete("/{menu_id}")
def delete_menu(menu_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    db.delete(menu)
    db.commit()
    return {"ok": True}


@router.post("/{menu_id}/retry", response_model=MenuSummary)
def retry_menu(menu_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    if menu.status == "processing":
        raise HTTPException(status_code=409, detail="El menú ya se está generando")
    menu.status = "pending"
    menu.error_message = None
    db.commit()
    enqueue_menu_generation(menu.id)
    return menu


@router.post("/{menu_id}/share", response_model=ShareResponse)
def enable_share(menu_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    if not menu.share_token:
        menu.share_token = secrets.token_urlsafe(16)
        db.commit()
    return ShareResponse(share_token=menu.share_token)


@router.delete("/{menu_id}/share", response_model=ShareResponse)
def disable_share(menu_id: str, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    menu = db.get(Menu, menu_id)
    if menu is None:
        raise HTTPException(status_code=404, detail="Menú no encontrado")
    menu.share_token = None
    db.commit()
    return ShareResponse(share_token=None)
