import { useState, type FormEvent } from "react";
import { api } from "../api";
import { CATEGORIES } from "../categories";
import type { Ingredient, Recipe, Step } from "../types";

interface Props {
  recipe: Recipe;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}

function serializeWithGroups(lines: { grupo?: string; text: string }[]): string {
  const out: string[] = [];
  let current = "";
  for (const line of lines) {
    const grupo = (line.grupo ?? "").trim();
    if (grupo !== current) {
      out.push(grupo ? `## ${grupo}` : "##");
      current = grupo;
    }
    out.push(line.text);
  }
  return out.join("\n");
}

function parseWithGroups(text: string): { grupo: string; text: string }[] {
  const result: { grupo: string; text: string }[] = [];
  let current = "";
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      current = line.slice(2).trim();
      continue;
    }
    result.push({ grupo: current, text: line });
  }
  return result;
}

export function EditRecipeModal({ recipe, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description);
  const [category, setCategory] = useState(recipe.category);
  const [servings, setServings] = useState(recipe.servings ?? "");
  const [totalTime, setTotalTime] = useState(recipe.total_time_min?.toString() ?? "");
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [ingredientsText, setIngredientsText] = useState(
    serializeWithGroups(
      recipe.ingredients.map((i) => ({
        grupo: i.grupo,
        text: [i.cantidad, i.nombre, i.notas].filter(Boolean).join(" | "),
      }))
    )
  );
  const [stepsText, setStepsText] = useState(
    serializeWithGroups(recipe.steps.map((s) => ({ grupo: s.grupo, text: s.texto })))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const ingredients: Ingredient[] = parseWithGroups(ingredientsText).map(({ grupo, text }) => {
      const parts = text.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        return { cantidad: parts[0], nombre: parts[1], notas: parts[2] ?? "", grupo };
      }
      return { cantidad: "", nombre: parts[0], notas: "", grupo };
    });

    const steps: Step[] = parseWithGroups(stepsText).map(({ grupo, text }, i) => ({
      orden: i + 1,
      texto: text,
      grupo,
    }));

    try {
      const updated = await api.updateRecipe(recipe.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        servings: servings.trim() || null,
        total_time_min: totalTime ? parseInt(totalTime, 10) : null,
        tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        ingredients,
        steps,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Editar receta</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label>Descripción</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Categoría</label>
              <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Raciones</label>
              <input className="input" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4 personas" />
            </div>
            <div className="field">
              <label>Tiempo total (min)</label>
              <input className="input" type="number" min="0" value={totalTime} onChange={(e) => setTotalTime(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Etiquetas (separadas por comas)</label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="pollo, al horno, rápido" />
          </div>
          <div className="field">
            <label>
              Ingredientes (uno por línea: cantidad | ingrediente | notas). Para agrupar por
              componente escribe una línea "## Para la masa"
            </label>
            <textarea
              className="textarea"
              style={{ minHeight: 130 }}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder={"## Para el bizcocho\n200 g | harina | tamizada\n2 | huevos"}
            />
          </div>
          <div className="field">
            <label>Pasos (uno por línea; también puedes agrupar con "## Para la salsa")</label>
            <textarea
              className="textarea"
              style={{ minHeight: 160 }}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
