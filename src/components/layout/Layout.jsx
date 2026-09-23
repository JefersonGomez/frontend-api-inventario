import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { AssistantWidget } from "@/components/assistant/AssistantWidget" 

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar fijo en desktop */}
      <Sidebar className="hidden lg:flex" />

      {/* Sidebar como panel deslizante en móvil */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 border-0">
          <Sidebar className="flex" />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AssistantWidget /> 
    </div>
  )
}