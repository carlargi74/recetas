import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Layout } from "../components/Layout";
import { EditIcon, PlusIcon, TrashIcon, UserIcon } from "../icons";
import type { Profile, ProfileIn, User } from "../types";

const ACTIVITY_OPTIONS = [
  { value: "sedentario", label: "Sedentario (poco o nada de ejercicio)" },
  { value: "ligero", label: "Ligero (ejercicio 1-3 días/semana)" },
  { value: "moderado", label: "Moderado (ejercicio 3-5 días/semana)" },
  { value: "activo", label: "Activo (ejercicio 6-7 días/semana)" },
  { value: "muy_activo", label: "Muy activo (intenso a diario o trabajo físico)" },
];

export function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function emptyProfile(): ProfileIn {
  return {
    name: "",
    user_id: null,
    birth_date: null,
    sex: null,
    height_cm: null,
    weight_kg: null,
    activity_level: null,
    habits: "",
    medical_notes: "",
    allergies: "",
    diet_preferences: "",
    dislikes: "",
    notes: "",
  };
}

function profileToIn(profile: Profile): ProfileIn {
  const { id: _id, created_by: _cb, created_at: _ca, ...rest } = profile;
  return rest;
}

interface FormProps {
  initial: ProfileIn;
  users: User[];
  onClose: () => void;
  onSave: (data: ProfileIn) => Promise<void>;
}

function ProfileForm({ initial, users, onClose, onSave }: FormProps) {
  const [data, setData] = useState<ProfileIn>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProfileIn>(key: K, value: ProfileIn[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ ...data, name: data.name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setBusy(false);
    }
  }

  const age = computeAge(data.birth_date);
  const bmi =
    data.height_cm && data.weight_kg ? Math.round((data.weight_kg / (data.height_cm / 100) ** 2) * 10) / 10 : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{initial.name ? "Editar perfil" : "Nuevo perfil"}</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          Todos los datos son opcionales salvo el nombre. Cuantos más datos, más ajustados serán los menús.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="field">
              <label>Nombre *</label>
              <input className="input" value={data.name} onChange={(e) => set("name", e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label>Cuenta de usuario vinculada</label>
              <select className="select" value={data.user_id ?? ""} onChange={(e) => set("user_id", e.target.value || null)}>
                <option value="">Sin cuenta (invitado / familiar)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="field">
              <label>Fecha de nacimiento {age != null && <span className="muted">· {age} años</span>}</label>
              <input className="input" type="date" value={data.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value || null)} />
            </div>
            <div className="field">
              <label>Sexo</label>
              <select className="select" value={data.sex ?? ""} onChange={(e) => set("sex", e.target.value || null)}>
                <option value="">—</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="field">
              <label>Actividad física</label>
              <select className="select" value={data.activity_level ?? ""} onChange={(e) => set("activity_level", e.target.value || null)}>
                <option value="">—</option>
                {ACTIVITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3">
            <div className="field">
              <label>Altura (cm)</label>
              <input className="input" type="number" min="30" max="260" value={data.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="field">
              <label>Peso (kg)</label>
              <input className="input" type="number" min="2" max="400" step="0.1" value={data.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="field">
              <label>IMC</label>
              <input className="input" value={bmi ?? "—"} readOnly disabled />
            </div>
          </div>

          <div className="field">
            <label>Alergias e intolerancias</label>
            <input className="input" value={data.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="Ej. intolerancia a la lactosa, alergia a los frutos secos" />
          </div>
          <div className="field">
            <label>Preferencias alimentarias</label>
            <input className="input" value={data.diet_preferences} onChange={(e) => set("diet_preferences", e.target.value)} placeholder="Ej. vegetariano, poco picante, come mucho pescado" />
          </div>
          <div className="field">
            <label>Alimentos que no le gustan</label>
            <input className="input" value={data.dislikes} onChange={(e) => set("dislikes", e.target.value)} placeholder="Ej. coliflor, hígado" />
          </div>
          <div className="field">
            <label>Datos médicos relevantes</label>
            <textarea className="textarea" value={data.medical_notes} onChange={(e) => set("medical_notes", e.target.value)} placeholder="Ej. colesterol alto, diabetes tipo 2, hipertensión, embarazo..." />
          </div>
          <div className="field">
            <label>Hábitos</label>
            <textarea className="textarea" value={data.habits} onChange={(e) => set("habits", e.target.value)} placeholder="Ej. come fuera los martes, entrena por la tarde, desayuna poco..." />
          </div>
          <div className="field">
            <label>Otras notas</label>
            <textarea className="textarea" value={data.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !data.name.trim()}>
              {busy ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProfilesPage() {
  const { user: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);

  function load() {
    api.listProfiles().then(setProfiles).catch(() => setProfiles([]));
    if (me?.is_admin) api.listUsers().then(setUsers).catch(() => {});
  }

  useEffect(load, [me?.is_admin]);

  async function handleDelete(profile: Profile) {
    if (!window.confirm(`¿Eliminar el perfil de "${profile.name}"?`)) return;
    await api.deleteProfile(profile.id);
    load();
  }

  return (
    <Layout>
      <div className="toolbar">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Perfiles
        </h1>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          Nuevo perfil
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Las personas para las que se diseñan los menús: familia, invitados... con o sin cuenta en la app.
      </p>

      {profiles === null ? (
        <div className="processing-panel">
          <div className="spinner" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="empty-state">
          <UserIcon />
          <h3>Todavía no hay perfiles</h3>
          <p>Crea un perfil por cada persona para la que quieras planificar menús.</p>
        </div>
      ) : (
        <div className="profile-grid">
          {profiles.map((profile) => {
            const age = computeAge(profile.birth_date);
            const linked = users.find((u) => u.id === profile.user_id);
            return (
              <div key={profile.id} className="panel profile-card">
                <div className="profile-avatar">{profile.name.slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="profile-name">{profile.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {[
                      age != null ? `${age} años` : null,
                      profile.sex,
                      profile.height_cm ? `${profile.height_cm} cm` : null,
                      profile.weight_kg ? `${profile.weight_kg} kg` : null,
                      linked ? `cuenta: ${linked.username}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sin datos adicionales"}
                  </div>
                  {(profile.allergies || profile.medical_notes) && (
                    <div className="profile-flags">
                      {profile.allergies && <span className="badge badge-error">Alergias: {profile.allergies}</span>}
                      {profile.medical_notes && <span className="badge badge-processing">Médico: {profile.medical_notes}</span>}
                    </div>
                  )}
                </div>
                <div className="profile-actions">
                  <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => setEditing(profile)}>
                    <EditIcon style={{ width: 14, height: 14 }} />
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" onClick={() => handleDelete(profile)}>
                    <TrashIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ProfileForm
          initial={editing === "new" ? emptyProfile() : profileToIn(editing)}
          users={users}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === "new") await api.createProfile(data);
            else await api.updateProfile(editing.id, data);
            setEditing(null);
            load();
          }}
        />
      )}
    </Layout>
  );
}
