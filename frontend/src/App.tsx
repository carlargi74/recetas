import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MenuDetailPage } from "./pages/MenuDetailPage";
import { MenuSharePage } from "./pages/MenuSharePage";
import { MenusPage } from "./pages/MenusPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { SharePage } from "./pages/SharePage";
import { ShoppingListPage } from "./pages/ShoppingListPage";
import { ShoppingListsPage } from "./pages/ShoppingListsPage";
import { UsersPage } from "./pages/UsersPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="processing-panel">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const privateRoutes: { path: string; element: ReactNode }[] = [
  { path: "/", element: <HomePage /> },
  { path: "/receta/:id", element: <RecipeDetailPage /> },
  { path: "/menus", element: <MenusPage /> },
  { path: "/menus/:id", element: <MenuDetailPage /> },
  { path: "/listas", element: <ShoppingListsPage /> },
  { path: "/listas/:id", element: <ShoppingListPage /> },
  { path: "/perfiles", element: <ProfilesPage /> },
  { path: "/usuarios", element: <UsersPage /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/s/:token" element={<SharePage />} />
      <Route path="/m/:token" element={<MenuSharePage />} />
      <Route path="/l/:token" element={<ShoppingListPage publicMode />} />
      {privateRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={<RequireAuth>{route.element}</RequireAuth>} />
      ))}
      <Route path="/compra" element={<Navigate to="/listas" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
