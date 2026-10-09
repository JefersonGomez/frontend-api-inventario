import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { AssistantWidget } from "@/components/assistant/AssistantWidget"
import { useRealtime } from "@/hoocks/useRealtime"

export function Layout() {
  useRealtime()
  return (
    <div className="stk-app">
      <div className="stk-shell">
        <Sidebar />
        <div>
          <Topbar />
          <main>
            <Outlet />
          </main>
        </div>
      </div>

      <AssistantWidget />
    </div>
  )
}
