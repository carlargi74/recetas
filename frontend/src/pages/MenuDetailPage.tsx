import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { MenuPlanView, type MenuViewMode } from "../components/MenuPlanView";
import { formatRange } from "../dates";
import { BackIcon, BasketIcon, LinkIcon, PrintIcon, RetryIcon, ShareIcon, TrashIcon } from "../icons";
import { MEAL_LABELS, type MealType, type Menu, type ShoppingListSummary } from "../types";

const VIEWS: { id: MenuViewMode; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "dia", label: "Día" },
  { id: "lista", label: "Lista" },
];

function defaultView(menu: Menu): MenuViewMode {
  const days = menu.plan?.dias.length ?? 1;
  if (days <= 2) return "dia";
  if (days > 14) return "mes";
  return "semana";
}

interface ListModalProps {
  menu: Menu;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function CreateListModal({ menu, onClose, onCreated }: ListModalProps) {
  const [startDate, setStartDate] = useState(menu.start_date);
  const [endDate, setEndDate] = useState(menu.end_date);
  const [meals, setMeals] = useState<MealType[]>(menu.meals);
  const [diners, setDiners] = useState(String(Math.max(1, menu.profile_ids.length + menu.guests_count)));
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const list = await api.createShoppingList({
        menu_id: menu.id,
        start_date: startDate,
        end_date: endDate,
        meals,
        diners: parseInt(diners, 10) || undefined,
        title: title.trim() || undefined,
      });
      onCreated(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Lista de la compra del menú</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="field">
              <label>Desde</label>
              <input className="input" type="date" value={startDate} min={menu.start_date} max={menu.end_date} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input className="input" type="date" value={endDate} min={startDate} max={menu.end_date} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Comidas a incluir</label>
            <div className="check-row">
              {menu.meals.map((m) => (
                <label key={m} className={`check-pill ${meals.includes(m) ? "on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={meals.includes(m)}
                    onChange={() => setMeals(meals.includes(m) ? meals.filter((x) => x !== m) : [...meals, m])}
                  />
                  {MEAL_LABELS[m]}
                </label>
              ))}
            </div>
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label>Comensales</label>
              <input className="input" type="number" min="1" max="100" value={diners} onChange={(e) => setDiners(e.target.value)} required />
            </div>
            <div className="field">
              <label>Nombre de la lista (opcional)</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Se genera automáticamente" />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || meals.length === 0}>
              {busy ? "Generando (puede tardar un poco)..." : "Crear lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [lists, setLists] = useState<ShoppingListSummary[]>([]);
  const [error, setError] = useState("");
  const [view, setView] = useState<MenuViewMode | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    api.getMenu(id).then(setMenu).catch((err) => setError(err.message));
    api.listShoppingLists(id).then(setLists).catch(() => {});
  }, [id]);

  useEffect(load, [load]);

  const processing = menu && (menu.status === "pending" || menu.status === "processing");
  useEffect(() => {
    if (!processing) return;
    const interval = window.setInterval(load, 4000);
    return () => window.clearInterval(interval);
  }, [processing, load]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function toggleShare() {
    if (!menu) return;
    if (menu.share_token) {
      await api.disableMenuShare(menu.id);
      setMenu({ ...menu, share_token: null });
      showToast("Enlace público desactivado");
    } else {
      const { share_token } = await api.enableMenuShare(menu.id);
      setMenu({ ...menu, share_token });
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/m/${share_token}`);
        showToast("Enlace público copiado al portapapeles");
      } catch {
        showToast("Enlace público activado");
      }
    }
  }

  async function copyShareLink() {
    if (!menu?.share_token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/m/${menu.share_token}`);
    showToast("Enlace copiado");
  }

  async function handleDelete() {
    if (!menu) return;
    if (!window.confirm(`¿Eliminar el menú "${menu.title}"? Las listas de la compra asociadas se conservan.`)) return;
    await api.deleteMenu(menu.id);
    navigate("/menus");
  }

  if (error) {
    return (
      <Layout>
        <div className="empty-state">
          <h3>No se pudo cargar el menú</h3>
          <p>{error}</p>
          <Link to="/menus" className="btn btn-ghost">
            Volver a menús
          </Link>
        </div>
      </Layout>
    );
  }

  if (!menu) {
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
          <h3>Diseñando el menú...</h3>
          <p style={{ color: "var(--ink-soft)" }}>
            {menu.progress || "La IA está eligiendo platos y ajustando raciones."}
            <br />
            Puede tardar varios minutos en menús largos. Puedes salir de esta página.
          </p>
        </div>
      </Layout>
    );
  }

  if (menu.status === "error") {
    return (
      <Layout>
        <div className="empty-state">
          <h3>Error al generar el menú</h3>
          <p>{menu.error_message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <button className="btn btn-primary" onClick={async () => { await api.retryMenu(menu.id); load(); }}>
              <RetryIcon style={{ width: 16, height: 16 }} />
              Reintentar
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              <TrashIcon style={{ width: 16, height: 16 }} />
              Eliminar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentView = view ?? defaultView(menu);

  return (
    <Layout wide>
      <div className="detail-top no-print">
        <Link to="/menus" className="btn btn-ghost btn-icon" title="Volver">
          <BackIcon style={{ width: 17, height: 17 }} />
        </Link>
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <PrintIcon style={{ width: 15, height: 15 }} />
          Imprimir
        </button>
        <button className="btn btn-ghost btn-sm" onClick={toggleShare}>
          <ShareIcon style={{ width: 15, height: 15 }} />
          {menu.share_token ? "Dejar de compartir" : "Compartir"}
        </button>
        {menu.share_token && (
          <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
            <LinkIcon style={{ width: 15, height: 15 }} />
            Copiar enlace
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => setShowListModal(true)}>
          <BasketIcon style={{ width: 15, height: 15 }} />
          Lista de la compra
        </button>
        <button className="btn btn-danger btn-sm btn-icon" title="Eliminar menú" onClick={handleDelete}>
          <TrashIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      <div className="menu-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {menu.title}
          </h1>
          <div className="muted">
            {formatRange(menu.start_date, menu.end_date)} · {menu.goal || "Menú"} ·{" "}
            {menu.meals.map((m) => MEAL_LABELS[m]).join(", ")}
          </div>
          {(menu.profiles.length > 0 || menu.guests_count > 0) && (
            <div className="muted" style={{ marginTop: 2 }}>
              Para: {[...menu.profiles.map((p) => p.name), menu.guests_count > 0 ? `${menu.guests_count} invitado${menu.guests_count === 1 ? "" : "s"}` : null].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        <div className="tab-switch view-switch no-print">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={currentView === v.id ? "active" : ""} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {(menu.summary || menu.people_notes.length > 0) && (
        <div className="panel menu-summary">
          {menu.summary && <p style={{ marginTop: 0 }}>{menu.summary}</p>}
          {menu.people_notes.length > 0 && (
            <div className="people-notes">
              {menu.people_notes.map((note, i) => (
                <div key={i} className="person-note">
                  <div className="person-note-name">
                    {note.nombre || "Persona"}
                    {note.kcal_dia ? <span className="muted"> · ~{Math.round(note.kcal_dia)} kcal/día</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 13.5 }}>{note.indicaciones}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <MenuPlanView menu={menu} mode={currentView} />

      <div className="menu-lists no-print">
        <h3 className="info-section-title" style={{ marginTop: 28 }}>
          <BasketIcon />
          Listas de la compra de este menú
        </h3>
        {lists.length === 0 ? (
          <p className="muted">Todavía no hay listas. Crea una para todo el menú o para un tramo de días.</p>
        ) : (
          <div className="list-grid">
            {lists.map((list) => (
              <Link key={list.id} to={`/listas/${list.id}`} className="panel list-card">
                <div className="list-card-title">{list.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {list.diners} comensales · {list.checked_items}/{list.total_items} comprados
                  {list.share_token ? " · compartida" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showListModal && (
        <CreateListModal menu={menu} onClose={() => setShowListModal(false)} onCreated={(listId) => navigate(`/listas/${listId}`)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </Layout>
  );
}
