import uuid
from collections import Counter
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import MEAL_LABELS, Menu, Recipe, ShoppingList, User
from ..schemas import ShoppingListCreate
from . import ai


def _format_range(start: date | None, end: date | None) -> str:
    if start and end:
        if start == end:
            return start.strftime("%d/%m/%Y")
        return f"{start.strftime('%d/%m')} – {end.strftime('%d/%m/%Y')}"
    return ""


def collect_menu_recipes(menu: Menu, start: date, end: date, meals: list[str]) -> Counter:
    """Cuenta cuántas veces aparece cada receta en el tramo y comidas indicados."""
    counter: Counter = Counter()
    for day in (menu.plan or {}).get("dias", []):
        try:
            day_date = date.fromisoformat(day.get("fecha", ""))
        except ValueError:
            continue
        if day_date < start or day_date > end:
            continue
        for meal in day.get("comidas", []):
            if meals and meal.get("tipo") not in meals:
                continue
            for dish in meal.get("platos", []):
                if dish.get("recipe_id"):
                    counter[dish["recipe_id"]] += 1
    return counter


def create_shopping_list(db: Session, body: ShoppingListCreate, user: User) -> ShoppingList:
    """Genera (con Gemini) y guarda una lista de la compra. Operación bloqueante."""
    menu: Menu | None = None
    start, end = body.start_date, body.end_date
    meals = body.meals

    if body.menu_id:
        menu = db.get(Menu, body.menu_id)
        if menu is None or menu.status != "ready":
            raise HTTPException(status_code=404, detail="Menú no encontrado o aún no generado")
        start = max(start or menu.start_date, menu.start_date)
        end = min(end or menu.end_date, menu.end_date)
        if start > end:
            raise HTTPException(status_code=400, detail="El rango de fechas no es válido")
        meals = [m for m in meals if m in menu.meals] or list(menu.meals)
        counter = collect_menu_recipes(menu, start, end, meals)
        diners = body.diners or max(1, len(menu.profile_ids) + menu.guests_count)
    else:
        if not body.recipe_ids:
            raise HTTPException(status_code=400, detail="Selecciona al menos una receta")
        counter = Counter(body.recipe_ids)
        diners = body.diners or 4

    if not counter:
        raise HTTPException(status_code=400, detail="No hay platos en el tramo seleccionado")

    recipes = db.scalars(select(Recipe).where(Recipe.id.in_(list(counter)), Recipe.status == "ready")).all()
    if not recipes:
        raise HTTPException(status_code=400, detail="No hay recetas válidas para la lista")

    payload = [
        {
            "titulo": r.title,
            "raciones_originales": r.servings or "no indicado",
            "comensales": diners,
            "veces": counter[r.id],
            "ingredientes": [
                {"cantidad": i.get("cantidad", ""), "nombre": i.get("nombre", ""), "notas": i.get("notas", "")}
                for i in (r.ingredients or [])
            ],
        }
        for r in recipes
    ]

    try:
        data = ai.generate_shopping_list(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo generar la lista: {exc}")

    sections = []
    for raw_section in data.get("secciones", []):
        if not isinstance(raw_section, dict):
            continue
        items = []
        for raw_item in raw_section.get("items") or []:
            if not isinstance(raw_item, dict) or not raw_item.get("nombre"):
                continue
            items.append({
                "id": uuid.uuid4().hex[:12],
                "cantidad": str(raw_item.get("cantidad") or ""),
                "nombre": str(raw_item["nombre"]),
                "recetas": [str(x) for x in (raw_item.get("recetas") or [])],
                "checked": False,
            })
        if items:
            sections.append({"nombre": str(raw_section.get("nombre") or "Otros"), "items": items})

    if body.title:
        title = body.title.strip()
    elif menu is not None:
        meal_part = ""
        if meals and len(meals) < len(menu.meals):
            meal_part = " · " + ", ".join(MEAL_LABELS.get(m, m) for m in meals)
        title = f"{menu.title} · {_format_range(start, end)}{meal_part}"
    else:
        title = "Compra: " + ", ".join(r.title for r in recipes[:3]) + ("..." if len(recipes) > 3 else "")

    shopping_list = ShoppingList(
        title=title,
        menu_id=menu.id if menu else None,
        start_date=start if menu else None,
        end_date=end if menu else None,
        meals=meals if menu else [],
        recipe_titles=[r.title for r in recipes],
        diners=diners,
        sections=sections,
        created_by=user.id,
    )
    db.add(shopping_list)
    db.commit()
    return shopping_list
