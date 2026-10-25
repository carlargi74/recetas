import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, videoUrl } from "../api";
import { Infographic } from "../components/Infographic";
import { NutritionPanel } from "../components/NutritionPanel";
import { LogoIcon } from "../icons";
import type { Recipe } from "../types";

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api.getShared(token).then(setRecipe).catch(() => setError("Esta receta no existe o ya no está compartida."));
  }, [token]);

  if (error) {
    return (
      <div className="share-banner">
        <div className="empty-state">
          <LogoIcon />
          <h3>Receta no disponible</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="processing-panel">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="share-banner">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <LogoIcon className="logo-md" />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Recetas</span>
      </div>
      <Infographic recipe={recipe} />
      {recipe.nutrition && (
        <div style={{ marginTop: 20 }}>
          <NutritionPanel nutrition={recipe.nutrition} status={recipe.nutrition_status} />
        </div>
      )}
      {recipe.video_filename && (
        <div className="video-panel" style={{ marginTop: 20, position: "static" }}>
          <video src={videoUrl(recipe.video_filename)} controls playsInline preload="metadata" />
        </div>
      )}
    </div>
  );
}
