import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { AssistantWidget } from "@/components/assistant/AssistantWidget"
import { useRealtime } from "@/hoocks/useRealtime"
import { useQuery } from "@tanstack/react-query"
import { getCompany } from "@/api/company"
import { SuspendedScreen } from "@/components/SuspendedScreen"
import { usePlatformOwner } from "@/hoocks/usePlatformOwner"

// Lo único a lo que accede el dueño de la plataforma
const OWNER_PATHS = ["/platform", "/profile", "/settings"]

export function Layout() {
  useRealtime()
  const { pathname } = useLocation()
  const { isPlatformOwner, isLoading } = usePlatformOwner()
  // GET /company sigue permitido con la empresa suspendida: de ahí sale el aviso
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getCompany })
  // sin saber si es el dueño no se pinta nada (evita mostrar un instante el menú de un cliente)
  if (isLoading) return <div className="stk-app" aria-busy="true" />
  if (isPlatformOwner && !OWNER_PATHS.includes(pathname)) return <Navigate to="/platform" replace />

  return (
    <div className="stk-app">
      <div className="stk-shell">
        <Sidebar />
        <div>
          <Topbar />
          <main key={pathname} className="stk-page-enter">
            {company?.suspendedAt ? <SuspendedScreen reason={company.suspensionReason} /> : <Outlet />}
          </main>
        </div>
      </div>

      {!isPlatformOwner && (
        <div className="print:hidden">
          <AssistantWidget />
        </div>
      )}
    </div>
  )
}
