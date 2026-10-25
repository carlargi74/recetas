import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { BasketIcon, BookIcon, CalendarIcon, LogoIcon, LogoutIcon, ServingsIcon, UserIcon } from "../icons";

const iconStyle = { width: 16, height: 16 };

export function Layout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="app-header no-print">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <LogoIcon />
            <span className="brand-text">Recetas</span>
          </Link>
          <nav className="main-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <BookIcon style={iconStyle} />
              <span>Recetas</span>
            </NavLink>
            <NavLink to="/menus" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <CalendarIcon style={iconStyle} />
              <span>Menús</span>
            </NavLink>
            <NavLink to="/listas" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <BasketIcon style={iconStyle} />
              <span>Listas</span>
            </NavLink>
            <NavLink to="/perfiles" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <UserIcon style={iconStyle} />
              <span>Perfiles</span>
            </NavLink>
            {user?.is_admin && (
              <NavLink to="/usuarios" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <ServingsIcon style={iconStyle} />
                <span>Usuarios</span>
              </NavLink>
            )}
          </nav>
          <div className="header-actions">
            <button
              className="btn btn-ghost btn-sm"
              title={`Cerrar sesión (${user?.display_name})`}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogoutIcon style={{ width: 15, height: 15 }} />
              <span className="hide-mobile">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <main className={`container ${wide ? "container-wide" : ""}`}>{children}</main>
    </>
  );
}
