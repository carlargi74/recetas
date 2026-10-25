import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { AddRecipeModal } from "../components/AddRecipeModal";
import { Layout } from "../components/Layout";
import { RecipeCard } from "../components/RecipeCard";
import { BasketIcon, DishIcon, PlusIcon, SearchIcon } from "../icons";
import type { Category, RecipeSummary } from "../types";

export function HomePage() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [diners, setDiners] = useState("4");
  const [generating, setGenerating] = useState(false);
  const [shopError, setShopError] = useState("");
  const debounceRef = useRef<number>(0);

  const load = useCallback(async (q: string, cat: string) => {
    const [recipeList, categoryList] = await Promise.all([api.listRecipes(q, cat), api.listCategories()]);
    setRecipes(recipeList);
    setCategories(categoryList);
  }, []);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      load(query, category).catch(() => {});
    }, query ? 250 : 0);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, category, load]);

  // Refrescar mientras haya recetas procesándose
  const hasProcessing = recipes?.some((r) => r.status === "pending" || r.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = window.setInterval(() => load(query, category).catch(() => {}), 5000);
    return () => window.clearInterval(interval);
  }, [hasProcessing, query, category, load]);

  const visibleCategories = categories.filter((c) => c.count > 0);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
    setShopError("");
  }

  async function generateList() {
    const dinersNumber = parseInt(diners, 10);
    if (!dinersNumber || dinersNumber < 1) {
      setShopError("Indica un número de comensales válido");
      return;
    }
    setGenerating(true);
    setShopError("");
    try {
      const list = await api.createShoppingList({ recipe_ids: [...selected], diners: dinersNumber });
      exitSelection();
      navigate(`/listas/${list.id}`);
    } catch (err) {
      setShopError(err instanceof Error ? err.message : "Error inesperado");
      setGenerating(false);
    }
  }

  return (
    <Layout>
      <div className="toolbar">
        <div className="search-box">
          <SearchIcon />
          <input
            className="input"
            placeholder="Buscar por nombre, ingrediente, etiqueta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className={`btn ${selecting ? "btn-primary" : "btn-ghost"}`}
          onClick={() => (selecting ? exitSelection() : setSelecting(true))}
          title="Elige varias recetas y genera la lista de la compra"
        >
          <BasketIcon style={{ width: 16, height: 16 }} />
          {selecting ? "Cancelar" : "Lista de la compra"}
        </button>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          Añadir receta
        </button>
      </div>

      {selecting && (
        <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>
          Toca las recetas del menú (primero, segundo, postre...) y abajo indica los comensales.
        </p>
      )}

      {visibleCategories.length > 0 && (
        <div className="chips">
          <button className={`chip ${category === "" ? "active" : ""}`} onClick={() => setCategory("")}>
            Todas
          </button>
          {visibleCategories.map((c) => (
            <button
              key={c.name}
              className={`chip ${category === c.name ? "active" : ""}`}
              onClick={() => setCategory(category === c.name ? "" : c.name)}
            >
              {c.name}
              <span className="count">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {recipes === null ? (
        <div className="processing-panel">
          <div className="spinner" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <DishIcon />
          <h3>{query || category ? "Sin resultados" : "Todavía no hay recetas"}</h3>
          <p>
            {query || category
              ? "Prueba con otra búsqueda o categoría."
              : "Añade tu primera receta pegando un enlace de TikTok o Instagram."}
          </p>
          {!query && !category && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <PlusIcon style={{ width: 16, height: 16 }} />
              Añadir receta
            </button>
          )}
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selectable={selecting}
              selected={selected.has(recipe.id)}
              onToggle={() => toggleSelected(recipe.id)}
            />
          ))}
        </div>
      )}

      {selecting && (
        <div className="selection-bar">
          <span className="selection-count">
            {selected.size} {selected.size === 1 ? "receta" : "recetas"}
          </span>
          <label className="selection-diners">
            Comensales
            <input
              className="input"
              type="number"
              min="1"
              max="50"
              value={diners}
              onChange={(e) => setDiners(e.target.value)}
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0 || generating}
            onClick={generateList}
          >
            <BasketIcon style={{ width: 16, height: 16 }} />
            {generating ? "Generando..." : "Crear lista"}
          </button>
          {shopError && <span className="error-text">{shopError}</span>}
        </div>
      )}

      {showAdd && (
        <AddRecipeModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            setQuery("");
            setCategory("");
            load("", "").catch(() => {});
          }}
        />
      )}
    </Layout>
  );
}
