import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { addDays, formatRange, toISODate } from "../dates";
import { CalendarIcon, PlusIcon } from "../icons";
import { MEAL_LABELS, MEAL_TYPES, type MealType, type MenuSummary, type Profile } from "../types";

const GOALS = [
  "Comer variado y saludable",
  "Bajar peso",
  "Ganar músculo",
  "Cuidar la salud",
  "Celebración / ocasión especial",
  "Otro",
];

const DURATIONS = [
  { label: "1 día", days: 1 },
  { label: "2 días", days: 2 },
  { label: "1 semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
];

interface CreateProps {
  profiles: Profile[];
  onClose: () => void;
  onCreated: (id: string) => void;
}

function CreateMenuModal({ profiles, onClose, onCreated }: CreateProps) {
  const today = toISODate(new Date());
  const [title, setTitle] = useState("");
  const [goalOption, setGoalOption] = useState(GOALS[0]);
  const [goalCustom, setGoalCustom] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(toISODate(addDays(new Date(), 6)));
  const [meals, setMeals] = useState<MealType[]>(["desayuno", "comida", "cena"]);
  const [profileIds, setProfileIds] = useState<string[]>(profiles.map((p) => p.id));
  const [guests, setGuests] = useState("0");
  const [guestsNotes, setGuestsNotes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setDuration(days: number) {
    setEndDate(toISODate(addDays(new Date(startDate + "T00:00:00"), days - 1)));
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const goal = goalOption === "Otro" ? goalCustom.trim() : goalOption;
      const menu = await api.createMenu({
        title: title.trim(),
        goal,
        instructions: instructions.trim(),
        start_date: startDate,
        end_date: endDate,
        meals: MEAL_TYPES.filter((m) => meals.includes(m)),
        profile_ids: profileIds,
        guests_count: parseInt(guests, 10) || 0,
        guests_notes: guestsNotes.trim(),
      });
      onCreated(menu.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Nuevo menú</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nombre del menú *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Semana del 12 de octubre, Cena de Navidad..." required autoFocus />
          </div>

          <div className="form-grid-2">
            <div className="field">
              <label>Objetivo</label>
              <select className="select" value={goalOption} onChange={(e) => setGoalOption(e.target.value)}>
                {GOALS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            {goalOption === "Otro" && (
              <div className="field">
                <label>Describe el objetivo</label>
                <input className="input" value={goalCustom} onChange={(e) => setGoalCustom(e.target.value)} required />
              </div>
            )}
          </div>

          <div className="field">
            <label>Duración</label>
            <div className="chips" style={{ marginBottom: 8 }}>
              {DURATIONS.map((d) => (
                <button key={d.days} type="button" className="chip" onClick={() => setDuration(d.days)}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="form-grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Desde</label>
                <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Hasta</label>
                <input className="input" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="field">
            <label>Comidas a planificar</label>
            <div className="check-row">
              {MEAL_TYPES.map((m) => (
                <label key={m} className={`check-pill ${meals.includes(m) ? "on" : ""}`}>
                  <input type="checkbox" checked={meals.includes(m)} onChange={() => setMeals(toggle(meals, m))} />
                  {MEAL_LABELS[m]}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Personas</label>
            {profiles.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No hay perfiles. Puedes crearlos en <Link to="/perfiles">Perfiles</Link> o indicar solo invitados.
              </p>
            ) : (
              <div className="check-row">
                {profiles.map((p) => (
                  <label key={p.id} className={`check-pill ${profileIds.includes(p.id) ? "on" : ""}`}>
                    <input type="checkbox" checked={profileIds.includes(p.id)} onChange={() => setProfileIds(toggle(profileIds, p.id))} />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-grid-2">
            <div className="field">
              <label>Invitados adicionales (sin perfil)</label>
              <input className="input" type="number" min="0" max="100" value={guests} onChange={(e) => setGuests(e.target.value)} />
            </div>
            <div className="field">
              <label>Notas sobre los invitados</label>
              <input className="input" value={guestsNotes} onChange={(e) => setGuestsNotes(e.target.value)} placeholder="Ej. dos niños pequeños, uno vegetariano" />
            </div>
          </div>

          <div className="field">
            <label>Indicaciones para la IA</label>
            <textarea
              className="textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ej. Cena de Navidad con entrante, principal y postre, que incluya marisco. / Cenas ligeras, comidas para llevar al trabajo. / Presupuesto ajustado."
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || meals.length === 0}>
              {busy ? "Creando..." : "Generar menú"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MenusPage() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState<MenuSummary[] | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    api.listMenus().then(setMenus).catch(() => setMenus([]));
  }

  useEffect(() => {
    load();
    api.listProfiles().then(setProfiles).catch(() => {});
  }, []);

  const hasProcessing = menus?.some((m) => m.status === "pending" || m.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, [hasProcessing]);

  return (
    <Layout>
      <div className="toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Menús
        </h1>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          Nuevo menú
        </button>
      </div>

      {menus === null ? (
        <div className="processing-panel">
          <div className="spinner" />
        </div>
      ) : menus.length === 0 ? (
        <div className="empty-state">
          <CalendarIcon />
          <h3>Todavía no hay menús</h3>
          <p>Crea un menú a medida: una semana, un mes, una cena especial... la IA lo diseña con tus recetas.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} />
            Nuevo menú
          </button>
        </div>
      ) : (
        <div className="menu-grid">
          {menus.map((menu) => {
            const processing = menu.status === "pending" || menu.status === "processing";
            const people = menu.profile_ids
              .map((id) => profiles.find((p) => p.id === id)?.name)
              .filter(Boolean) as string[];
            return (
              <Link key={menu.id} to={`/menus/${menu.id}`} className="panel menu-card">
                <div className="menu-card-top">
                  {processing ? (
                    <span className="badge badge-processing">
                      <span className="dot" />
                      Generando
                    </span>
                  ) : menu.status === "error" ? (
                    <span className="badge badge-error">Error</span>
                  ) : (
                    <span className="badge badge-category">{menu.goal || "Menú"}</span>
                  )}
                </div>
                <div className="menu-card-title">{menu.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatRange(menu.start_date, menu.end_date)}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {menu.meals.map((m) => MEAL_LABELS[m]).join(", ")}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  {[...people, menu.guests_count > 0 ? `${menu.guests_count} invitado${menu.guests_count === 1 ? "" : "s"}` : null]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {processing && menu.progress && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{menu.progress}</div>}
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateMenuModal
          profiles={profiles}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => navigate(`/menus/${id}`)}
        />
      )}
    </Layout>
  );
}
