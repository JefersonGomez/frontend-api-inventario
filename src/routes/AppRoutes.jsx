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
import { PermissionRoute } from "./PermissionRoute"
import { PurchaseOrders } from "@/pages/PurchaseOrders"
import { Transfers } from "@/pages/Transfers"
import { StockCounts } from "@/pages/StockCounts"
import { StockCount } from "@/pages/StockCount"
import { Labels } from "@/pages/Labels"
import { DailySummaries } from "@/pages/DailySummaries"
import { AuditLogPage } from "@/pages/AuditLog"
import { AcceptInvite } from "@/pages/AcceptInvite"
import { Platform } from "@/pages/Platform"
import { Legal } from "@/pages/Legal"
import { PlatformRoute } from "./PlatformRoute"
import { Pos } from "@/pages/pos/Pos"
import { PosOpen } from "@/pages/pos/PosOpen"
import { PosClose } from "@/pages/pos/PosClose"
import { CustomerDisplay } from "@/pages/pos/CustomerDisplay"
import { Negatives } from "@/pages/Negatives"
import { ReceivableAccount, Receivables } from "@/pages/Receivables"
import { PayableAccount, Payables } from "@/pages/Payables"
import { SaleDetail, Sales } from "@/pages/Sales"
import { CashClosings } from "@/pages/CashClosings"
import { CashClosing } from "@/pages/CashClosing"

// Caja: a pantalla completa, fuera del Layout (por eso no va en children)
const pos = (page) => (
  <ProtectedRoute>
    <PermissionRoute perm="cash.manage">{page}</PermissionRoute>
  </ProtectedRoute>
)
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
  { path: "/pos", element: pos(<PermissionRoute perm="sales.sell"><Pos /></PermissionRoute>) },
  { path: "/pos/abrir", element: pos(<PosOpen />) },
  { path: "/pos/cierre", element: pos(<PosClose />) },
  { path: "/pos/cliente", element: pos(<CustomerDisplay />) },
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
      { path: "transfers", element: <PermissionRoute perm="stock.move"><Transfers /></PermissionRoute> },
      { path: "stock-counts", element: <PermissionRoute perm="stock.move"><StockCounts /></PermissionRoute> },
      { path: "stock-counts/:id", element: <PermissionRoute perm="stock.move"><StockCount /></PermissionRoute> },
      { path: "labels", element: <PermissionRoute perm="stock.move"><Labels /></PermissionRoute> },
      { path: "negatives", element: <PermissionRoute perm="stock.move"><Negatives /></PermissionRoute> },
      { path: "cash-closings", element: <PermissionRoute perm="cash.reconcile"><CashClosings /></PermissionRoute> },
      { path: "cash-closings/:id", element: <PermissionRoute perm="cash.reconcile"><CashClosing /></PermissionRoute> },
      { path: "daily-summaries", element: <PermissionRoute perm="reports.view"><DailySummaries /></PermissionRoute> },
      { path: "reports", element: <PermissionRoute perm="reports.view"><Reports /></PermissionRoute> },
      { path: "profile", element: <Profile /> },
      {path:"settings", element:<Settings/>},
      { path: "users", element: <PermissionRoute perm="users.manage"><Users /></PermissionRoute> },
      { path: "suppliers", element: <Suppliers /> },
      { path: "customers", element: <Customers /> },
      { path: "sales", element: <PermissionRoute perm={["sales.sell", "sales.void", "reports.view"]}><Sales /></PermissionRoute> },
      { path: "sales/:id", element: <PermissionRoute perm={["sales.sell", "sales.void", "reports.view"]}><SaleDetail /></PermissionRoute> },
      { path: "receivables", element: <PermissionRoute perm="receivables.manage"><Receivables /></PermissionRoute> },
      { path: "receivables/:id", element: <PermissionRoute perm="receivables.manage"><ReceivableAccount /></PermissionRoute> },
      { path: "payables", element: <PermissionRoute perm="payables.manage"><Payables /></PermissionRoute> },
      { path: "payables/:id", element: <PermissionRoute perm="payables.manage"><PayableAccount /></PermissionRoute> },
      {path:"purchase-requests", element:<PurchaseRequests />},
      { path: "purchase-orders", element: <PermissionRoute perm="purchases.manage"><PurchaseOrders /></PermissionRoute> },
      { path: "audit-log", element: <PermissionRoute perm="audit.view"><AuditLogPage /></PermissionRoute> },
      { path: "platform", element: <PlatformRoute><Platform /></PlatformRoute> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}