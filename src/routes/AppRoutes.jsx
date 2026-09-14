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
import { Settings } from "@/pages/Settings"
import {Users}from "@/pages/Users"
import { AdminRoute } from "./AdminRoute"
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
  path: "users",
  element: (
    <AdminRoute>
      <Users />
    </AdminRoute>
  ),
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
      {path:"settings", element:<Settings/>},
      { path: "users", element: <Users /> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}