import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Layout } from "../components/Layout";
import { PlusIcon, TrashIcon } from "../icons";
import type { User } from "../types";

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function load() {
    api.listUsers().then(setUsers).catch(() => {});
  }

  useEffect(load, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api.createUser({
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        is_admin: isAdmin,
      });
      setShowCreate(false);
      setUsername("");
      setDisplayName("");
      setPassword("");
      setIsAdmin(false);
      load();
      showToast("Usuario creado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`¿Eliminar al usuario "${user.username}"?`)) return;
    await api.deleteUser(user.id);
    load();
  }

  async function handleResetPassword(user: User) {
    const newPassword = window.prompt(`Nueva contraseña para ${user.username} (mínimo 6 caracteres):`);
    if (!newPassword) return;
    try {
      await api.resetUserPassword(user.id, newPassword);
      showToast("Contraseña cambiada");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error");
    }
  }

  if (!me?.is_admin) {
    return (
      <Layout>
        <div className="empty-state">
          <h3>Solo para administradores</h3>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Usuarios
        </h1>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          Nuevo usuario
        </button>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.display_name}</td>
                <td>{user.is_admin ? "Administrador" : "Usuario"}</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(user)}>
                      Cambiar contraseña
                    </button>
                    {user.id !== me.id && (
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(user)}>
                        <TrashIcon style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo usuario</h2>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Nombre de usuario</label>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} autoFocus />
              </div>
              <div className="field">
                <label>Nombre para mostrar</label>
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej. María" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
                Es administrador (puede gestionar usuarios)
              </label>
              {error && <p className="error-text">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </Layout>
  );
}
