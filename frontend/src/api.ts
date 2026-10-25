import type {
  Category,
  Menu,
  MenuCreate,
  MenuSummary,
  Profile,
  ProfileIn,
  Recipe,
  RecipeSummary,
  ShoppingList,
  ShoppingListCreate,
  ShoppingListSummary,
  User,
} from "./types";

const TOKEN_KEY = "recetas_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/share/")) {
    setToken(null);
    window.location.href = "/login";
    throw new ApiError(401, "Sesión caducada");
  }
  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data.detail === "string") detail = data.detail;
    } catch {
      /* respuesta sin JSON */
    }
    throw new ApiError(response.status, detail);
  }
  return response.json();
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  // Sesión
  login: (username: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", json({ username, password })),
  me: () => request<User>("/api/auth/me"),
  changeMyPassword: (new_password: string) =>
    request<{ ok: boolean }>("/api/auth/me/password", json({ new_password })),

  // Recetas
  listRecipes: (q: string, category: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    return request<RecipeSummary[]>(`/api/recipes?${params}`);
  },
  getRecipe: (id: string) => request<Recipe>(`/api/recipes/${id}`),
  listCategories: () => request<Category[]>("/api/recipes/categories"),
  createFromUrl: (url: string) => request<RecipeSummary>("/api/recipes/from-url", json({ url })),
  createFromFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<RecipeSummary>("/api/recipes/upload", { method: "POST", body: form });
  },
  updateRecipe: (id: string, data: Partial<Recipe>) =>
    request<Recipe>(`/api/recipes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRecipe: (id: string) => request<{ ok: boolean }>(`/api/recipes/${id}`, { method: "DELETE" }),
  retryRecipe: (id: string) => request<RecipeSummary>(`/api/recipes/${id}/retry`, { method: "POST" }),
  recomputeNutrition: (id: string) => request<Recipe>(`/api/recipes/${id}/nutrition`, { method: "POST" }),
  enableShare: (id: string) =>
    request<{ share_token: string }>(`/api/recipes/${id}/share`, { method: "POST" }),
  disableShare: (id: string) =>
    request<{ share_token: null }>(`/api/recipes/${id}/share`, { method: "DELETE" }),
  getShared: (token: string) => request<Recipe>(`/api/share/${token}`),

  // Perfiles
  listProfiles: () => request<Profile[]>("/api/profiles"),
  createProfile: (data: ProfileIn) => request<Profile>("/api/profiles", json(data)),
  updateProfile: (id: string, data: ProfileIn) =>
    request<Profile>(`/api/profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProfile: (id: string) => request<{ ok: boolean }>(`/api/profiles/${id}`, { method: "DELETE" }),

  // Menús
  listMenus: () => request<MenuSummary[]>("/api/menus"),
  createMenu: (data: MenuCreate) => request<MenuSummary>("/api/menus", json(data)),
  getMenu: (id: string) => request<Menu>(`/api/menus/${id}`),
  deleteMenu: (id: string) => request<{ ok: boolean }>(`/api/menus/${id}`, { method: "DELETE" }),
  retryMenu: (id: string) => request<MenuSummary>(`/api/menus/${id}/retry`, { method: "POST" }),
  enableMenuShare: (id: string) =>
    request<{ share_token: string }>(`/api/menus/${id}/share`, { method: "POST" }),
  disableMenuShare: (id: string) =>
    request<{ share_token: null }>(`/api/menus/${id}/share`, { method: "DELETE" }),
  getSharedMenu: (token: string) => request<Menu>(`/api/share/menu/${token}`),

  // Listas de la compra
  listShoppingLists: (menuId?: string) =>
    request<ShoppingListSummary[]>(`/api/shopping-lists${menuId ? `?menu_id=${menuId}` : ""}`),
  createShoppingList: (data: ShoppingListCreate) => request<ShoppingList>("/api/shopping-lists", json(data)),
  getShoppingList: (id: string) => request<ShoppingList>(`/api/shopping-lists/${id}`),
  deleteShoppingList: (id: string) =>
    request<{ ok: boolean }>(`/api/shopping-lists/${id}`, { method: "DELETE" }),
  checkItem: (listId: string, itemId: string, checked: boolean) =>
    request<ShoppingList>(`/api/shopping-lists/${listId}/items/${itemId}`, json({ checked })),
  enableListShare: (id: string) =>
    request<{ share_token: string }>(`/api/shopping-lists/${id}/share`, { method: "POST" }),
  disableListShare: (id: string) =>
    request<{ share_token: null }>(`/api/shopping-lists/${id}/share`, { method: "DELETE" }),
  getSharedList: (token: string) => request<ShoppingList>(`/api/share/list/${token}`),
  checkSharedItem: (token: string, itemId: string, checked: boolean) =>
    request<ShoppingList>(`/api/share/list/${token}/items/${itemId}`, json({ checked })),

  // Usuarios
  listUsers: () => request<User[]>("/api/users"),
  createUser: (data: { username: string; password: string; display_name: string; is_admin: boolean }) =>
    request<User>("/api/users", json(data)),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/api/users/${id}`, { method: "DELETE" }),
  resetUserPassword: (id: string, new_password: string) =>
    request<{ ok: boolean }>(`/api/users/${id}/password`, json({ new_password })),
};

export function imageUrl(filename: string | null): string {
  return filename ? `/media/images/${filename}` : "";
}

export function videoUrl(filename: string | null): string {
  return filename ? `/media/videos/${filename}` : "";
}
