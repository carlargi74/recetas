from datetime import date, datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=6)
    display_name: str = ""
    is_admin: bool = False


class PasswordChange(BaseModel):
    new_password: str = Field(min_length=6)


# ---------- Recetas ----------


class Ingredient(BaseModel):
    cantidad: str = ""
    nombre: str
    notas: str = ""
    grupo: str = ""


class Step(BaseModel):
    orden: int
    texto: str
    grupo: str = ""


class RecipeCreateFromUrl(BaseModel):
    url: str


class RecipeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    servings: str | None = None
    prep_time_min: int | None = None
    cook_time_min: int | None = None
    total_time_min: int | None = None
    difficulty: str | None = None
    ingredients: list[Ingredient] | None = None
    steps: list[Step] | None = None
    tips: list[str] | None = None


class RecipeSummary(BaseModel):
    id: str
    status: str
    error_message: str | None
    title: str
    category: str
    tags: list
    total_time_min: int | None
    difficulty: str | None
    thumbnail_filename: str | None
    share_token: str | None
    source_type: str
    nutrition_status: str | None = None
    kcal_per_serving: float | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class RecipeOut(RecipeSummary):
    source_url: str | None
    description: str
    servings: str | None
    prep_time_min: int | None
    cook_time_min: int | None
    ingredients: list
    steps: list
    tips: list
    nutrition: dict | None
    video_filename: str | None
    frames: list
    created_by: str | None

    class Config:
        from_attributes = True


class ShareResponse(BaseModel):
    share_token: str | None


# ---------- Perfiles ----------


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    user_id: str | None = None
    birth_date: date | None = None
    sex: str | None = None
    height_cm: float | None = Field(default=None, ge=30, le=260)
    weight_kg: float | None = Field(default=None, ge=2, le=400)
    activity_level: str | None = None
    habits: str = ""
    medical_notes: str = ""
    allergies: str = ""
    diet_preferences: str = ""
    dislikes: str = ""
    notes: str = ""


class ProfileOut(ProfileIn):
    id: str
    created_by: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Menús ----------


class MenuCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    goal: str = ""
    instructions: str = ""
    start_date: date
    end_date: date
    meals: list[str] = Field(min_length=1)
    profile_ids: list[str] = []
    guests_count: int = Field(default=0, ge=0, le=100)
    guests_notes: str = ""


class MenuSummary(BaseModel):
    id: str
    title: str
    goal: str
    start_date: date
    end_date: date
    meals: list
    profile_ids: list
    guests_count: int
    status: str
    error_message: str | None
    progress: str
    share_token: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MenuRecipeRef(BaseModel):
    id: str
    title: str
    thumbnail_filename: str | None
    kcal_per_serving: float | None
    share_token: str | None
    category: str


class MenuOut(MenuSummary):
    instructions: str
    guests_notes: str
    plan: dict | None
    people_notes: list
    summary: str
    recipes: dict[str, MenuRecipeRef] = {}
    profiles: list[ProfileOut] = []
    created_by: str | None

    class Config:
        from_attributes = True


# ---------- Listas de la compra ----------


class ShoppingListCreate(BaseModel):
    title: str | None = None
    menu_id: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    meals: list[str] = []
    recipe_ids: list[str] = []
    diners: int | None = Field(default=None, ge=1, le=100)


class ShoppingListSummary(BaseModel):
    id: str
    title: str
    menu_id: str | None
    start_date: date | None
    end_date: date | None
    meals: list
    diners: int
    recipe_titles: list
    share_token: str | None
    total_items: int = 0
    checked_items: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShoppingListOut(ShoppingListSummary):
    sections: list
    menu_title: str | None = None

    class Config:
        from_attributes = True
