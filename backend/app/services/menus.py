import logging
from datetime import date, timedelta

from sqlalchemy import select

from ..database import SessionLocal
from ..models import MEAL_TYPES, Menu, Profile, Recipe
from . import ai
from .pipeline import apply_recipe_data, enqueue_nutrition, light_executor, normalize_text

logger = logging.getLogger(__name__)

CHUNK_DAYS = 7

ACTIVITY_LABELS = {
    "sedentario": "sedentario (poco o nada de ejercicio)",
    "ligero": "ligeramente activo (ejercicio 1-3 días/semana)",
    "moderado": "moderadamente activo (ejercicio 3-5 días/semana)",
    "activo": "activo (ejercicio 6-7 días/semana)",
    "muy_activo": "muy activo (ejercicio intenso diario o trabajo físico)",
}


def compute_age(birth_date: date | None, today: date | None = None) -> int | None:
    if birth_date is None:
        return None
    today = today or date.today()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def profile_to_prompt(profile: Profile) -> dict:
    data: dict = {"profile_id": profile.id, "nombre": profile.name}
    age = compute_age(profile.birth_date)
    if age is not None:
        data["edad"] = age
    if profile.sex:
        data["sexo"] = profile.sex
    if profile.height_cm:
        data["altura_cm"] = profile.height_cm
    if profile.weight_kg:
        data["peso_kg"] = profile.weight_kg
    if profile.height_cm and profile.weight_kg:
        data["imc"] = round(profile.weight_kg / ((profile.height_cm / 100) ** 2), 1)
    if profile.activity_level:
        data["actividad"] = ACTIVITY_LABELS.get(profile.activity_level, profile.activity_level)
    for field, key in (
        ("habits", "habitos"),
        ("medical_notes", "datos_medicos"),
        ("allergies", "alergias_intolerancias"),
        ("diet_preferences", "preferencias_alimentarias"),
        ("dislikes", "no_le_gusta"),
        ("notes", "otras_notas"),
    ):
        value = getattr(profile, field)
        if value:
            data[key] = value
    return data


def catalog_entry(recipe: Recipe) -> dict:
    return {
        "id": recipe.id,
        "titulo": recipe.title,
        "categoria": recipe.category,
        "etiquetas": recipe.tags or [],
        "kcal_racion": recipe.kcal_per_serving,
        "raciones": recipe.servings,
    }


def date_range(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def enqueue_menu_generation(menu_id: str) -> None:
    light_executor.submit(_generate_menu, menu_id)


def _generate_menu(menu_id: str) -> None:
    db = SessionLocal()
    try:
        menu = db.get(Menu, menu_id)
        if menu is None:
            return
        menu.status = "processing"
        menu.error_message = None
        menu.progress = "Preparando..."
        db.commit()

        try:
            profiles = (
                db.scalars(select(Profile).where(Profile.id.in_(menu.profile_ids))).all()
                if menu.profile_ids
                else []
            )
            people = [profile_to_prompt(p) for p in profiles]
            profile_names = {p.id: p.name for p in profiles}

            catalog_recipes = db.scalars(select(Recipe).where(Recipe.status == "ready")).all()
            catalog = [catalog_entry(r) for r in catalog_recipes]
            titles_by_id = {r.id: r.title for r in catalog_recipes}

            all_dates = date_range(menu.start_date, menu.end_date)
            chunks = [all_dates[i : i + CHUNK_DAYS] for i in range(0, len(all_dates), CHUNK_DAYS)]
            meals = [m for m in menu.meals if m in MEAL_TYPES] or ["comida", "cena"]

            plan_days: dict[str, dict] = {}
            used_titles: list[str] = []
            people_notes: list = []
            summary = ""
            new_recipe_ids: list[str] = []

            for index, chunk in enumerate(chunks):
                first, last = chunk[0], chunk[-1]
                menu.progress = (
                    f"Planificando del {first.strftime('%d/%m')} al {last.strftime('%d/%m')} "
                    f"(tramo {index + 1} de {len(chunks)})"
                )
                db.commit()

                chunk_dates = [d.isoformat() for d in chunk]
                data = ai.generate_menu_chunk(
                    title=menu.title,
                    goal=menu.goal,
                    instructions=menu.instructions,
                    dates=chunk_dates,
                    meals=meals,
                    people=people,
                    guests_count=menu.guests_count,
                    guests_notes=menu.guests_notes,
                    catalog=catalog,
                    used_titles=used_titles[-60:],
                    is_first_chunk=index == 0,
                )

                # Recetas nuevas propuestas por la IA (reutilizando las que ya existan con el mismo título)
                ref_map: dict[str, str] = {}
                for raw in data.get("nuevas_recetas") or []:
                    if not isinstance(raw, dict) or not raw.get("titulo"):
                        continue
                    existing_id = next(
                        (rid for rid, title in titles_by_id.items() if normalize_text(title) == normalize_text(str(raw["titulo"]))),
                        None,
                    )
                    if existing_id:
                        ref_map[str(raw.get("ref") or raw["titulo"])] = existing_id
                        continue
                    recipe = Recipe(source_type="ai", status="ready", created_by=menu.created_by)
                    apply_recipe_data(recipe, raw)
                    db.add(recipe)
                    db.flush()
                    ref_map[str(raw.get("ref") or recipe.title)] = recipe.id
                    catalog.append(catalog_entry(recipe))
                    titles_by_id[recipe.id] = recipe.title
                    new_recipe_ids.append(recipe.id)
                db.commit()

                # Días del tramo
                for position, raw_day in enumerate(data.get("dias") or []):
                    if not isinstance(raw_day, dict):
                        continue
                    fecha = str(raw_day.get("fecha") or "")
                    if fecha not in chunk_dates:
                        if position >= len(chunk_dates):
                            continue
                        fecha = chunk_dates[position]

                    comidas = []
                    for raw_meal in raw_day.get("comidas") or []:
                        if not isinstance(raw_meal, dict):
                            continue
                        tipo = str(raw_meal.get("tipo") or "").lower()
                        if tipo not in MEAL_TYPES:
                            continue
                        platos = []
                        for raw_dish in raw_meal.get("platos") or []:
                            if not isinstance(raw_dish, dict):
                                continue
                            ref = str(raw_dish.get("receta") or "")
                            recipe_id = ref_map.get(ref) or (ref if ref in titles_by_id else None)
                            if recipe_id is None:
                                continue
                            platos.append({
                                "recipe_id": recipe_id,
                                "titulo": titles_by_id[recipe_id],
                                "nota": str(raw_dish.get("nota") or ""),
                            })
                            used_titles.append(titles_by_id[recipe_id])
                        comidas.append({"tipo": tipo, "platos": platos, "nota": str(raw_meal.get("nota") or "")})

                    # Ordenar comidas según el orden configurado
                    comidas.sort(key=lambda c: meals.index(c["tipo"]) if c["tipo"] in meals else 99)
                    plan_days[fecha] = {"fecha": fecha, "comidas": comidas}

                if index == 0:
                    summary = str(data.get("resumen") or "")
                    for raw_person in data.get("personas") or []:
                        if not isinstance(raw_person, dict):
                            continue
                        pid = str(raw_person.get("profile_id") or "")
                        people_notes.append({
                            "profile_id": pid,
                            "nombre": profile_names.get(pid) or str(raw_person.get("nombre") or ""),
                            "kcal_dia": raw_person.get("kcal_dia"),
                            "indicaciones": str(raw_person.get("indicaciones") or ""),
                        })

            # Garantizar que todos los días existen
            dias = [plan_days.get(d.isoformat(), {"fecha": d.isoformat(), "comidas": []}) for d in all_dates]

            menu.plan = {"dias": dias}
            menu.people_notes = people_notes
            menu.summary = summary
            menu.status = "ready"
            menu.progress = ""
            db.commit()

            for recipe_id in new_recipe_ids:
                enqueue_nutrition(recipe_id)

        except Exception as exc:
            logger.exception("Error generando el menú %s", menu_id)
            db.rollback()
            menu = db.get(Menu, menu_id)
            if menu is not None:
                menu.status = "error"
                menu.error_message = str(exc)[:1000]
                menu.progress = ""
                db.commit()
    finally:
        db.close()
