import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { MenuPlanView, type MenuViewMode } from "../components/MenuPlanView";
import { formatRange } from "../dates";
import { LogoIcon, PrintIcon } from "../icons";
import { MEAL_LABELS, type Menu } from "../types";

const VIEWS: { id: MenuViewMode; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
  { id: "dia", label: "Día" },
  { id: "lista", label: "Lista" },
];

export function MenuSharePage() {
  const { token } = useParams<{ token: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<MenuViewMode | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getSharedMenu(token).then(setMenu).catch(() => setError("Este menú no existe o ya no está compartido."));
  }, [token]);

  if (error) {
    return (
      <div className="share-banner">
        <div className="empty-state">
          <LogoIcon />
          <h3>Menú no disponible</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="processing-panel">
        <div className="spinner" />
      </div>
    );
  }

  const days = menu.plan?.dias.length ?? 1;
  const currentView = view ?? (days <= 2 ? "dia" : days > 14 ? "mes" : "semana");

  return (
    <div className="container container-wide">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }} className="no-print">
        <LogoIcon className="logo-md" />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Recetas</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <PrintIcon style={{ width: 15, height: 15 }} />
          Imprimir
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
        </div>
        <div className="tab-switch view-switch no-print">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={currentView === v.id ? "active" : ""} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {menu.summary && (
        <div className="panel menu-summary">
          <p style={{ margin: 0 }}>{menu.summary}</p>
        </div>
      )}

      <MenuPlanView menu={menu} mode={currentView} publicMode />
    </div>
  );
}
