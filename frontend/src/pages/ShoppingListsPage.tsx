import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Layout } from "../components/Layout";
import { formatRange } from "../dates";
import { BasketIcon, TrashIcon } from "../icons";
import type { ShoppingListSummary } from "../types";

export function ShoppingListsPage() {
  const [lists, setLists] = useState<ShoppingListSummary[] | null>(null);

  function load() {
    api.listShoppingLists().then(setLists).catch(() => setLists([]));
  }

  useEffect(load, []);

  async function handleDelete(list: ShoppingListSummary) {
    if (!window.confirm(`¿Eliminar la lista "${list.title}"?`)) return;
    await api.deleteShoppingList(list.id);
    load();
  }

  return (
    <Layout>
      <h1 className="page-title">Listas de la compra</h1>
      <p className="muted" style={{ marginTop: -10 }}>
        Las listas se crean desde un menú (botón "Lista de la compra") o eligiendo recetas en el inicio.
        Se guardan para siempre y se pueden compartir para comprar entre varios.
      </p>

      {lists === null ? (
        <div className="processing-panel">
          <div className="spinner" />
        </div>
      ) : lists.length === 0 ? (
        <div className="empty-state">
          <BasketIcon />
          <h3>No hay listas todavía</h3>
          <p>
            Ve a <Link to="/menus">Menús</Link> o al <Link to="/">inicio</Link> para crear una.
          </p>
        </div>
      ) : (
        <div className="list-grid">
          {lists.map((list) => {
            const done = list.total_items > 0 && list.checked_items === list.total_items;
            return (
              <div key={list.id} className={`panel list-card ${done ? "done" : ""}`}>
                <Link to={`/listas/${list.id}`} style={{ color: "inherit", flex: 1, minWidth: 0 }}>
                  <div className="list-card-title">{list.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {list.start_date && list.end_date ? `${formatRange(list.start_date, list.end_date)} · ` : ""}
                    {list.diners} comensales · {list.checked_items}/{list.total_items} comprados
                    {list.share_token ? " · compartida" : ""}
                  </div>
                  <div className="list-progress">
                    <div className="list-progress-bar" style={{ width: `${list.total_items ? (list.checked_items / list.total_items) * 100 : 0}%` }} />
                  </div>
                </Link>
                <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" onClick={() => handleDelete(list)}>
                  <TrashIcon style={{ width: 14, height: 14 }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
