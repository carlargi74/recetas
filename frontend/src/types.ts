export interface User {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Ingredient {
  cantidad: string;
  nombre: string;
  notas: string;
  grupo?: string;
}

export interface Step {
  orden: number;
  texto: string;
  grupo?: string;
}

export type RecipeStatus = "pending" | "processing" | "ready" | "error";
export type NutritionStatus = "pending" | "processing" | "ready" | "error" | null;

export interface Nutrition {
  por?: string;
  raciones_consideradas?: number | null;
  calorias_kcal?: number | null;
  proteinas_g?: number | null;
  hidratos_g?: number | null;
  azucares_g?: number | null;
  grasas_g?: number | null;
  grasas_saturadas_g?: number | null;
  fibra_g?: number | null;
  sal_g?: number | null;
  colesterol_mg?: number | null;
  vitaminas?: Record<string, number | null>;
  minerales?: Record<string, number | null>;
  notas?: string;
}

export interface RecipeSummary {
  id: string;
  status: RecipeStatus;
  error_message: string | null;
  title: string;
  category: string;
  tags: string[];
  total_time_min: number | null;
  difficulty: string | null;
  thumbnail_filename: string | null;
  share_token: string | null;
  source_type: string;
  nutrition_status: NutritionStatus;
  kcal_per_serving: number | null;
  created_at: string;
}

export interface Recipe extends RecipeSummary {
  source_url: string | null;
  description: string;
  servings: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  ingredients: Ingredient[];
  steps: Step[];
  tips: string[];
  nutrition: Nutrition | null;
  video_filename: string | null;
  frames: string[];
  created_by: string | null;
}

export interface Category {
  name: string;
  count: number;
}

// ---------- Perfiles ----------

export interface ProfileIn {
  name: string;
  user_id: string | null;
  birth_date: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  habits: string;
  medical_notes: string;
  allergies: string;
  diet_preferences: string;
  dislikes: string;
  notes: string;
}

export interface Profile extends ProfileIn {
  id: string;
  created_by: string | null;
  created_at: string;
}

// ---------- Menús ----------

export type MealType = "desayuno" | "almuerzo" | "comida" | "merienda" | "cena";

export const MEAL_TYPES: MealType[] = ["desayuno", "almuerzo", "comida", "merienda", "cena"];

export const MEAL_LABELS: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
};

export interface MenuDish {
  recipe_id: string;
  titulo: string;
  nota: string;
}

export interface MenuMeal {
  tipo: MealType;
  platos: MenuDish[];
  nota: string;
}

export interface MenuDay {
  fecha: string;
  comidas: MenuMeal[];
}

export interface MenuPersonNote {
  profile_id: string;
  nombre: string;
  kcal_dia: number | null;
  indicaciones: string;
}

export interface MenuRecipeRef {
  id: string;
  title: string;
  thumbnail_filename: string | null;
  kcal_per_serving: number | null;
  share_token: string | null;
  category: string;
}

export interface MenuCreate {
  title: string;
  goal: string;
  instructions: string;
  start_date: string;
  end_date: string;
  meals: MealType[];
  profile_ids: string[];
  guests_count: number;
  guests_notes: string;
}

export interface MenuSummary {
  id: string;
  title: string;
  goal: string;
  start_date: string;
  end_date: string;
  meals: MealType[];
  profile_ids: string[];
  guests_count: number;
  status: RecipeStatus;
  error_message: string | null;
  progress: string;
  share_token: string | null;
  created_at: string;
}

export interface Menu extends MenuSummary {
  instructions: string;
  guests_notes: string;
  plan: { dias: MenuDay[] } | null;
  people_notes: MenuPersonNote[];
  summary: string;
  recipes: Record<string, MenuRecipeRef>;
  profiles: Profile[];
  created_by: string | null;
}

// ---------- Listas de la compra ----------

export interface ShoppingItem {
  id: string;
  cantidad: string;
  nombre: string;
  recetas: string[];
  checked: boolean;
}

export interface ShoppingSection {
  nombre: string;
  items: ShoppingItem[];
}

export interface ShoppingListCreate {
  title?: string;
  menu_id?: string;
  start_date?: string;
  end_date?: string;
  meals?: MealType[];
  recipe_ids?: string[];
  diners?: number;
}

export interface ShoppingListSummary {
  id: string;
  title: string;
  menu_id: string | null;
  start_date: string | null;
  end_date: string | null;
  meals: MealType[];
  diners: number;
  recipe_titles: string[];
  share_token: string | null;
  total_items: number;
  checked_items: number;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList extends ShoppingListSummary {
  sections: ShoppingSection[];
  menu_title: string | null;
}
