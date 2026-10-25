import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String, default="")
    password_hash: Mapped[str] = mapped_column(String)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Recipe(Base):
    __tablename__ = "recipes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)

    # pending | processing | ready | error
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_type: Mapped[str] = mapped_column(String, default="url")  # url | upload | ai

    title: Mapped[str] = mapped_column(String, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String, default="Otros", index=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    servings: Mapped[str | None] = mapped_column(String, nullable=True)
    prep_time_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cook_time_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_time_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String, nullable=True)

    # [{"cantidad": "200 g", "nombre": "harina", "notas": "", "grupo": ""}]
    ingredients: Mapped[list] = mapped_column(JSON, default=list)
    # [{"orden": 1, "texto": "...", "grupo": ""}]
    steps: Mapped[list] = mapped_column(JSON, default=list)
    tips: Mapped[list] = mapped_column(JSON, default=list)

    # Valores nutricionales estimados por ración (ver services/ai.py)
    nutrition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # None | pending | processing | ready | error
    nutrition_status: Mapped[str | None] = mapped_column(String, nullable=True)

    video_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    thumbnail_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    frames: Mapped[list] = mapped_column(JSON, default=list)

    share_token: Mapped[str | None] = mapped_column(String, nullable=True, unique=True, index=True)

    search_text: Mapped[str] = mapped_column(Text, default="")

    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)

    @property
    def kcal_per_serving(self) -> float | None:
        if not self.nutrition:
            return None
        value = self.nutrition.get("calorias_kcal")
        return float(value) if isinstance(value, (int, float)) else None


class Profile(Base):
    """Una persona (miembro de la familia o invitado), con o sin cuenta de usuario."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[str | None] = mapped_column(String, nullable=True)  # hombre | mujer | otro
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    # sedentario | ligero | moderado | activo | muy_activo
    activity_level: Mapped[str | None] = mapped_column(String, nullable=True)
    habits: Mapped[str] = mapped_column(Text, default="")
    medical_notes: Mapped[str] = mapped_column(Text, default="")
    allergies: Mapped[str] = mapped_column(Text, default="")
    diet_preferences: Mapped[str] = mapped_column(Text, default="")
    dislikes: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Menu(Base):
    __tablename__ = "menus"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String)
    goal: Mapped[str] = mapped_column(String, default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    # ["desayuno", "almuerzo", "comida", "merienda", "cena"]
    meals: Mapped[list] = mapped_column(JSON, default=list)
    profile_ids: Mapped[list] = mapped_column(JSON, default=list)
    guests_count: Mapped[int] = mapped_column(Integer, default=0)
    guests_notes: Mapped[str] = mapped_column(Text, default="")

    # pending | processing | ready | error
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress: Mapped[str] = mapped_column(String, default="")

    # {"dias": [{"fecha": "2026-10-12", "comidas": [{"tipo": "comida", "platos": [{"recipe_id", "titulo", "nota"}], "nota": ""}]}]}
    plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # [{"profile_id", "nombre", "kcal_dia", "indicaciones"}]
    people_notes: Mapped[list] = mapped_column(JSON, default=list)
    summary: Mapped[str] = mapped_column(Text, default="")

    share_token: Mapped[str | None] = mapped_column(String, nullable=True, unique=True, index=True)

    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String)
    menu_id: Mapped[str | None] = mapped_column(String, ForeignKey("menus.id", ondelete="SET NULL"), nullable=True, index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    meals: Mapped[list] = mapped_column(JSON, default=list)
    recipe_titles: Mapped[list] = mapped_column(JSON, default=list)
    diners: Mapped[int] = mapped_column(Integer, default=4)

    # [{"nombre": "Frutas y verduras", "items": [{"id", "cantidad", "nombre", "recetas", "checked"}]}]
    sections: Mapped[list] = mapped_column(JSON, default=list)

    share_token: Mapped[str | None] = mapped_column(String, nullable=True, unique=True, index=True)

    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    @property
    def total_items(self) -> int:
        return sum(len(s.get("items", [])) for s in (self.sections or []))

    @property
    def checked_items(self) -> int:
        return sum(1 for s in (self.sections or []) for i in s.get("items", []) if i.get("checked"))


CATEGORIES = [
    "Entrantes y aperitivos",
    "Sopas y cremas",
    "Ensaladas y verduras",
    "Pasta y arroz",
    "Legumbres",
    "Carnes",
    "Pescados y mariscos",
    "Huevos",
    "Panes y masas",
    "Postres y dulces",
    "Desayunos y meriendas",
    "Salsas y aliños",
    "Bebidas",
    "Otros",
]

MEAL_TYPES = ["desayuno", "almuerzo", "comida", "merienda", "cena"]

MEAL_LABELS = {
    "desayuno": "Desayuno",
    "almuerzo": "Almuerzo",
    "comida": "Comida",
    "merienda": "Merienda",
    "cena": "Cena",
}
