import { Link } from "react-router-dom";
import { imageUrl } from "../api";
import { CheckIcon, ClockIcon, DishIcon, FlameIcon } from "../icons";
import type { RecipeSummary } from "../types";

interface Props {
  recipe: RecipeSummary;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export function RecipeCard({ recipe, selectable, selected, onToggle }: Props) {
  const processing = recipe.status === "pending" || recipe.status === "processing";

  const body = (
    <>
      <div className="recipe-card-image">
        {recipe.thumbnail_filename ? (
          <img src={imageUrl(recipe.thumbnail_filename)} alt={recipe.title} loading="lazy" />
        ) : (
          <div className={`placeholder ${recipe.source_type === "ai" ? "placeholder-ai" : ""}`}>
            <DishIcon />
          </div>
        )}
        {processing && (
          <div className="card-status-overlay">
            <span className="badge badge-processing">
              <span className="dot" />
              Procesando
            </span>
          </div>
        )}
        {selectable && recipe.status === "ready" && (
          <span className={`check-badge ${selected ? "checked" : ""}`}>
            {selected && <CheckIcon style={{ width: 15, height: 15 }} />}
          </span>
        )}
      </div>
      <div className="recipe-card-body">
        {recipe.status === "error" ? (
          <span className="badge badge-error">Error al procesar</span>
        ) : (
          <span className="badge badge-category">{recipe.category}</span>
        )}
        <div className="recipe-card-title">{recipe.title || "Sin título"}</div>
        <div className="recipe-card-meta">
          {recipe.total_time_min != null && (
            <span className="meta-item">
              <ClockIcon />
              {recipe.total_time_min} min
            </span>
          )}
          {recipe.difficulty && (
            <span className="meta-item">
              <FlameIcon />
              {recipe.difficulty}
            </span>
          )}
          {recipe.kcal_per_serving != null && (
            <span className="meta-item">{Math.round(recipe.kcal_per_serving)} kcal</span>
          )}
          {recipe.source_type === "ai" && <span className="meta-item tag-ai">IA</span>}
        </div>
      </div>
    </>
  );

  if (selectable) {
    const enabled = recipe.status === "ready";
    return (
      <div
        className={`recipe-card ${selected ? "selected" : ""} ${enabled ? "" : "disabled"}`}
        onClick={enabled ? onToggle : undefined}
        role="button"
      >
        {body}
      </div>
    );
  }

  return (
    <Link to={`/receta/${recipe.id}`} className="recipe-card">
      {body}
    </Link>
  );
}
