import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { Dashboard } from "@/pages/Dashboard"
import { Products } from "@/pages/Products"
import { Categories } from "@/pages/Categories"
import { Movements } from "@/pages/Movements"
import { Reports } from "@/pages/Reports"
import { Login } from "@/pages/Login"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { Register } from "@/pages/Register"
import { Profile } from "@/pages/Profile"
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
   { path: "/register", element: <Register /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products", element: <Products /> },
      { path: "categories", element: <Categories /> },
      { path: "movements", element: <Movements /> },
      { path: "reports", element: <Reports /> },
      { path: "profile", element: <Profile /> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}