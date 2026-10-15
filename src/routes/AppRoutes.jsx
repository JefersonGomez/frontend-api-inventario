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
import { Suppliers } from "@/pages/Suppliers"
import { Customers } from "@/pages/Customers"
import {PurchaseRequests} from "@/pages/PurchaseRequests"
import { AdminRoute } from "./AdminRoute"
import { PurchaseOrders } from "@/pages/PurchaseOrders"
import { AuditLogPage } from "@/pages/AuditLog"
import { AcceptInvite } from "@/pages/AcceptInvite"
import { Platform } from "@/pages/Platform"
import { Legal } from "@/pages/Legal"
import { PlatformRoute } from "./PlatformRoute"
const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
   { path: "/register", element: <Register /> },
  // link de invitación: público (quien lo abre todavía no tiene sesión)
  { path: "/invite/:token", element: <AcceptInvite /> },
  // documentos legales: públicos (se leen antes de crear la cuenta)
  { path: "/terms", element: <Legal doc="terms" /> },
  { path: "/privacy", element: <Legal doc="privacy" /> },
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
      { path: "users", element: <AdminRoute><Users /></AdminRoute> },
      { path: "suppliers", element: <Suppliers /> },
      { path: "customers", element: <Customers /> },
      {path:"purchase-requests", element:<PurchaseRequests />},
      { path: "purchase-orders", element: <AdminRoute><PurchaseOrders /></AdminRoute> },
      { path: "audit-log", element: <AdminRoute><AuditLogPage /></AdminRoute> },
      { path: "platform", element: <PlatformRoute><Platform /></PlatformRoute> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}