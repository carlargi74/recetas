import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { formatRange } from "../dates";
import { BackIcon, CopyIcon, LinkIcon, LogoIcon, PrintIcon, ShareIcon, TrashIcon } from "../icons";
import { MEAL_LABELS, type ShoppingList } from "../types";

const SYNC_INTERVAL_MS = 5000;

function listToText(list: ShoppingList): string {
  const lines: string[] = [list.title, `${list.diners} comensales`, ""];
  for (const section of list.sections) {
    lines.push(section.nombre.toUpperCase());
    for (const item of section.items) {
      lines.push(`${item.checked ? "[x]" : "[ ]"} ${[item.cantidad, item.nombre].filter(Boolean).join(" ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function ShoppingListPage({ publicMode = false }: { publicMode?: boolean }) {
  const params = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const key = publicMode ? params.token : params.id;
  const [list, setList] = useState<ShoppingList | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const pendingRef = useRef(0);

  const load = useCallback(() => {
    if (!key) return;
    const promise = publicMode ? api.getSharedList(key) : api.getShoppingList(key);
    promise
      .then((data) => {
        // No pisar el estado local mientras hay cambios en vuelo
        if (pendingRef.current === 0) setList(data);
      })
      .catch((err) => setError(err.message));
  }, [key, publicMode]);

  useEffect(load, [load]);

  // Sincronización periódica (compartida entre dispositivos)
  useEffect(() => {
    const interval = window.setInterval(load, SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function toggle(itemId: string, checked: boolean) {
    if (!list || !key) return;
    setList({
      ...list,
      sections: list.sections.map((s) => ({
        ...s,
        items: s.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
      })),
    });
    pendingRef.current += 1;
    try {
      const updated = publicMode ? await api.checkSharedItem(key, itemId, checked) : await api.checkItem(key, itemId, checked);
      pendingRef.current -= 1;
      if (pendingRef.current === 0) setList(updated);
    } catch {
      pendingRef.current -= 1;
      showToast("No se pudo guardar el cambio");
      load();
    }
  }

  async function copyAsText() {
    if (!list) return;
    try {
      await navigator.clipboard.writeText(listToText(list));
      showToast("Lista copiada al portapapeles");
    } catch {
      showToast("No se pudo copiar");
    }
  }

  async function toggleShare() {
    if (!list) return;
    if (list.share_token) {
      await api.disableListShare(list.id);
      setList({ ...list, share_token: null });
      showToast("Enlace público desactivado");
    } else {
      const { share_token } = await api.enableListShare(list.id);
      setList({ ...list, share_token });
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/l/${share_token}`);
        showToast("Enlace copiado: quien lo abra podrá marcar lo comprado");
      } catch {
        showToast("Enlace público activado");
      }
    }
  }

  async function copyShareLink() {
    if (!list?.share_token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/l/${list.share_token}`);
    showToast("Enlace copiado");
  }

  async function handleDelete() {
    if (!list) return;
    if (!window.confirm(`¿Eliminar la lista "${list.title}"?`)) return;
    await api.deleteShoppingList(list.id);
    navigate("/listas");
  }

  const wrap = (children: ReactNode) =>
    publicMode ? <div className="share-banner">{children}</div> : <Layout>{children}</Layout>;

  if (error) {
    return wrap(
      <div className="empty-state">
        <h3>Lista no disponible</h3>
        <p>{publicMode ? "Esta lista no existe o ya no está compartida." : error}</p>
        {!publicMode && (
          <Link to="/listas" className="btn btn-ghost">
            Volver a listas
          </Link>
        )}
      </div>
    );
  }

  if (!list) {
    return wrap(
      <div className="processing-panel">
        <div className="spinner" />
      </div>
    );
  }

  return wrap(
    <>
      <div className="detail-top no-print">
        {publicMode ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <LogoIcon className="logo-md" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Recetas</span>
          </span>
        ) : (
          <Link to="/listas" className="btn btn-ghost btn-icon" title="Volver">
            <BackIcon style={{ width: 17, height: 17 }} />
          </Link>
        )}
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={copyAsText}>
          <CopyIcon style={{ width: 15, height: 15 }} />
          Copiar
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          <PrintIcon style={{ width: 15, height: 15 }} />
          Imprimir
        </button>
        {!publicMode && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={toggleShare}>
              <ShareIcon style={{ width: 15, height: 15 }} />
              {list.share_token ? "Dejar de compartir" : "Compartir"}
            </button>
            {list.share_token && (
              <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
                <LinkIcon style={{ width: 15, height: 15 }} />
                Copiar enlace
              </button>
            )}
            <button className="btn btn-danger btn-sm btn-icon" title="Eliminar lista" onClick={handleDelete}>
              <TrashIcon style={{ width: 15, height: 15 }} />
            </button>
          </>
        )}
      </div>

      <h1 className="page-title" style={{ marginBottom: 4 }}>
        {list.title}
      </h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {list.menu_title && !publicMode && list.menu_id && (
          <>
            Menú: <Link to={`/menus/${list.menu_id}`}>{list.menu_title}</Link> ·{" "}
          </>
        )}
        {list.start_date && list.end_date && <>{formatRange(list.start_date, list.end_date)} · </>}
        {list.meals.length > 0 && <>{list.meals.map((m) => MEAL_LABELS[m]).join(", ")} · </>}
        <strong>{list.diners} comensales</strong> · {list.checked_items}/{list.total_items} comprados
      </p>

      <div className="shop-sections">
        {list.sections.map((section) => (
          <div key={section.nombre} className="panel shop-section">
            <h3 className="shop-section-title">{section.nombre}</h3>
            <ul className="shop-items">
              {section.items.map((item) => (
                <li key={item.id} className={item.checked ? "checked" : ""} onClick={() => toggle(item.id, !item.checked)}>
                  <span className={`shop-checkbox ${item.checked ? "on" : ""}`} />
                  <span className="shop-item-text">
                    {item.cantidad && <strong>{item.cantidad} </strong>}
                    {item.nombre}
                    {item.recetas.length > 0 && <span className="shop-item-recipes"> · {item.recetas.join(", ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
