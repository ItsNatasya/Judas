import { createBrowserRouter, Navigate } from "react-router";
import HomePage from "./pages/HomePage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { isLoggedIn } from "./lib/api";

function AdminGuard({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/admin",
    element: <AdminLogin />,
  },
  {
    path: "/admin/dashboard",
    element: (
      <AdminGuard>
        <AdminDashboard />
      </AdminGuard>
    ),
  },
]);
