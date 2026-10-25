import { forwardRef } from "react";
import { imageUrl } from "../api";
import { BasketIcon, ChefHatIcon, LightbulbIcon, LogoIcon } from "../icons";
import type { Recipe } from "../types";

function formatTime(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function groupItems<T extends { grupo?: string }>(items: T[]): { grupo: string; items: T[] }[] {
  const groups: { grupo: string; items: T[] }[] = [];
  for (const item of items) {
    const grupo = (item.grupo ?? "").trim();
    const last = groups[groups.length - 1];
    if (last && last.grupo === grupo) last.items.push(item);
    else groups.push({ grupo, items: [item] });
  }
  return groups;
}

export const Infographic = forwardRef<HTMLDivElement, { recipe: Recipe }>(function Infographic(
  { recipe },
  ref
) {
  return (
    <div className="infographic" ref={ref}>
      <div className={`info-hero ${recipe.thumbnail_filename ? "" : "info-hero-empty"}`}>
        {recipe.thumbnail_filename && (
          <img src={imageUrl(recipe.thumbnail_filename)} alt={recipe.title} crossOrigin="anonymous" />
        )}
        <div className="info-hero-overlay">
          <span className="badge badge-category">{recipe.category}</span>
          <div className="info-title">{recipe.title}</div>
        </div>
      </div>

      <div className="info-stats">
        <div className="info-stat">
          <div className="value">{formatTime(recipe.prep_time_min)}</div>
          <div className="label">Preparación</div>
        </div>
        <div className="info-stat">
          <div className="value">{formatTime(recipe.cook_time_min)}</div>
          <div className="label">Cocción</div>
        </div>
        <div className="info-stat">
          <div className="value">{formatTime(recipe.total_time_min)}</div>
          <div className="label">Total</div>
        </div>
        <div className="info-stat">
          <div className="value">{recipe.servings ?? "—"}</div>
          <div className="label">Raciones</div>
        </div>
        {recipe.difficulty && (
          <div className="info-stat">
            <div className="value" style={{ textTransform: "capitalize" }}>
              {recipe.difficulty}
            </div>
            <div className="label">Dificultad</div>
          </div>
        )}
      </div>

      {recipe.nutrition && recipe.nutrition.calorias_kcal != null && (
        <div className="info-nutrition-strip">
          <span className="info-nutrition-label">Por ración</span>
          <span>
            <strong>{Math.round(recipe.nutrition.calorias_kcal)}</strong> kcal
          </span>
          <span>
            <strong>{Math.round(recipe.nutrition.proteinas_g ?? 0)} g</strong> proteínas
          </span>
          <span>
            <strong>{Math.round(recipe.nutrition.hidratos_g ?? 0)} g</strong> hidratos
          </span>
          <span>
            <strong>{Math.round(recipe.nutrition.grasas_g ?? 0)} g</strong> grasas
          </span>
          {recipe.nutrition.fibra_g != null && (
            <span>
              <strong>{Math.round(recipe.nutrition.fibra_g)} g</strong> fibra
            </span>
          )}
        </div>
      )}

      {recipe.description && <p className="info-description">"{recipe.description}"</p>}

      <div className="info-body">
        <div>
          <h3 className="info-section-title">
            <BasketIcon />
            Ingredientes
          </h3>
          {groupItems(recipe.ingredients).map((group, gi) => (
            <div key={gi}>
              {group.grupo && <div className="group-title">{group.grupo}</div>}
              <ul className="ingredient-list">
                {group.items.map((ing, i) => (
                  <li key={i}>
                    {ing.cantidad && <span className="qty">{ing.cantidad}</span>}
                    <span>
                      {ing.nombre}
                      {ing.notas && <span className="notes"> · {ing.notas}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div>
          <h3 className="info-section-title">
            <ChefHatIcon />
            Preparación
          </h3>
          {groupItems(recipe.steps).map((group, gi) => (
            <div key={gi}>
              {group.grupo && <div className="group-title">{group.grupo}</div>}
              <ol className="step-list">
                {group.items.map((step) => (
                  <li key={step.orden}>
                    <span className="step-number">{step.orden}</span>
                    <span className="step-text">{step.texto}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {recipe.tips.length > 0 && (
        <div className="tips-box">
          <h3 className="info-section-title">
            <LightbulbIcon />
            Consejos
          </h3>
          <ul>
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="info-tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="info-footer">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LogoIcon className="logo-sm" />
          <span style={{ fontWeight: 600 }}>Recetas</span>
        </span>
        <span>{recipe.source_type === "ai" ? "Receta propuesta por la IA para un menú" : "Receta guardada desde video"}</span>
      </div>
    </div>
  );
});
