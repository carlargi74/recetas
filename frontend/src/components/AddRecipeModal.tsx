import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { RecipeSummary } from "../types";

interface Props {
  onClose: () => void;
  onCreated: (recipe: RecipeSummary) => void;
}

export function AddRecipeModal({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const recipe =
        mode === "url" ? await api.createFromUrl(url.trim()) : await api.createFromFile(file!);
      onCreated(recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Añadir receta</h2>
        <div className="tab-switch">
          <button type="button" className={mode === "url" ? "active" : ""} onClick={() => setMode("url")}>
            Enlace del video
          </button>
          <button type="button" className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}>
            Subir video
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === "url" ? (
            <div className="field">
              <label>Pega el enlace (TikTok, Instagram, YouTube...)</label>
              <input
                className="input"
                type="url"
                placeholder="https://www.tiktok.com/... o https://www.instagram.com/reel/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
              />
            </div>
          ) : (
            <div className="field">
              <label>Archivo de video (mp4, mov, webm...)</label>
              <input
                className="input"
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || (mode === "url" ? !url.trim() : !file)}
            >
              {busy ? "Enviando..." : "Añadir y analizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
