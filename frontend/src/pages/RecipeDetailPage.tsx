import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, imageUrl, videoUrl } from "../api";
import { EditRecipeModal } from "../components/EditRecipeModal";
import { Infographic } from "../components/Infographic";
import { Layout } from "../components/Layout";
import { NutritionPanel } from "../components/NutritionPanel";
import {
  BackIcon,
  DownloadIcon,
  EditIcon,
  LinkIcon,
  RetryIcon,
  ShareIcon,
  TrashIcon,
} from "../icons";
import type { Recipe } from "../types";

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");
  const [lightbox, setLightbox] = useState("");
  const infographicRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!id) return;
    api.getRecipe(id).then(setRecipe).catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  const processing = recipe && (recipe.status === "pending" || recipe.status === "processing");
  const nutritionComputing =
    recipe && (recipe.nutrition_status === "pending" || recipe.nutrition_status === "processing");
  useEffect(() => {
    if (!processing && !nutritionComputing) return;
    const interval = window.setInterval(load, 4000);
    return () => window.clearInterval(interval);
  }, [processing, nutritionComputing, load]);

  async function recomputeNutrition() {
    if (!recipe) return;
    try {
      setRecipe(await api.recomputeNutrition(recipe.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error");
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function downloadInfographic() {
    if (!infographicRef.current || !recipe) return;
    try {
      const dataUrl = await toPng(infographicRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${recipe.title.replace(/[^\wáéíóúñü ]/gi, "").trim() || "receta"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      showToast("No se pudo generar la imagen");
    }
  }

  async function toggleShare() {
    if (!recipe) return;
    if (recipe.share_token) {
      await api.disableShare(recipe.id);
      setRecipe({ ...recipe, share_token: null });
      showToast("Enlace público desactivado");
    } else {
      const { share_token } = await api.enableShare(recipe.id);
      setRecipe({ ...recipe, share_token });
      const url = `${window.location.origin}/s/${share_token}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Enlace público copiado al portapapeles");
      } catch {
        showToast("Enlace público activado");
      }
    }
  }

  async function copyShareLink() {
    if (!recipe?.share_token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/s/${recipe.share_token}`);
    showToast("Enlace copiado al portapapeles");
  }

  async function handleDelete() {
    if (!recipe) return;
    if (!window.confirm(`¿Eliminar "${recipe.title}"? Se borrará también el video guardado.`)) return;
    await api.deleteRecipe(recipe.id);
    navigate("/");
  }

  async function handleRetry() {
    if (!recipe) return;
    await api.retryRecipe(recipe.id);
    load();
  }

  if (error) {
    return (
      <Layout>
        <div className="empty-state">
          <h3>No se pudo cargar la receta</h3>
          <p>{error}</p>
          <Link to="/" className="btn btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </Layout>
    );
  }

  if (!recipe) {
    return (
      <Layout>
        <div className="processing-panel">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (processing) {
    return (
      <Layout>
        <div className="processing-panel">
          <div className="spinner" />
          <h3>Analizando el video...</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            Estamos descargando el video y extrayendo la receta con IA.
            <br />
            Esto suele tardar entre 1 y 3 minutos. Puedes salir de esta página.
          </p>
        </div>
      </Layout>
    );
  }

  if (recipe.status === "error") {
    return (
      <Layout>
        <div className="empty-state">
          <h3>Error al procesar</h3>
          <p>{recipe.error_message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            {recipe.source_type !== "ai" && (
              <button className="btn btn-primary" onClick={handleRetry}>
                <RetryIcon style={{ width: 16, height: 16 }} />
                Reintentar
              </button>
            )}
            <button className="btn btn-danger" onClick={handleDelete}>
              <TrashIcon style={{ width: 16, height: 16 }} />
              Eliminar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="detail-top">
        <Link to="/" className="btn btn-ghost btn-icon" title="Volver">
          <BackIcon style={{ width: 17, height: 17 }} />
        </Link>
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={downloadInfographic}>
          <DownloadIcon style={{ width: 15, height: 15 }} />
          Infografía
        </button>
        <button className="btn btn-ghost btn-sm" onClick={toggleShare}>
          <ShareIcon style={{ width: 15, height: 15 }} />
          {recipe.share_token ? "Dejar de compartir" : "Compartir"}
        </button>
        {recipe.share_token && (
          <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
            <LinkIcon style={{ width: 15, height: 15 }} />
            Copiar enlace
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>
          <EditIcon style={{ width: 15, height: 15 }} />
          Editar
        </button>
        <button className="btn btn-danger btn-sm btn-icon" title="Eliminar receta" onClick={handleDelete}>
          <TrashIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      <div className="detail-layout">
        <div>
          <Infographic recipe={recipe} ref={infographicRef} />
          <div style={{ marginTop: 20 }}>
            <NutritionPanel
              nutrition={recipe.nutrition}
              status={recipe.nutrition_status}
              onRecompute={recomputeNutrition}
            />
          </div>
          {recipe.frames.length > 0 && (
            <div className="frames-strip">
              {recipe.frames.map((frame) => (
                <img
                  key={frame}
                  src={imageUrl(frame)}
                  alt="Fotograma del video"
                  loading="lazy"
                  onClick={() => setLightbox(imageUrl(frame))}
                />
              ))}
            </div>
          )}
        </div>

        {recipe.video_filename && (
          <div className="video-panel">
            <video src={videoUrl(recipe.video_filename)} controls playsInline preload="metadata" />
            {recipe.source_url && (
              <div className="video-footer">
                Original:{" "}
                <a href={recipe.source_url} target="_blank" rel="noreferrer">
                  {recipe.source_url}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <EditRecipeModal
          recipe={recipe}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setRecipe(updated);
            setShowEdit(false);
            showToast("Receta actualizada");
          }}
        />
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox("")}>
          <img src={lightbox} alt="Fotograma ampliado" />
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </Layout>
  );
}
