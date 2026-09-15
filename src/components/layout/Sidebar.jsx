import { LayoutDashboard, Package, FolderTree, ArrowLeftRight, BarChart3 } from "lucide-react"
import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Settings as SettingsIcon } from "lucide-react"
import { Users as UsersIcon } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Truck } from "lucide-react"
export function Sidebar({ className }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navItems = [
    { to: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    { to: "/products", label: t("sidebar.products"), icon: Package },
    { to: "/categories", label: t("sidebar.categories"), icon: FolderTree },
    { to: "/movements", label: t("sidebar.movements"), icon: ArrowLeftRight },
    { to: "/reports", label: t("sidebar.reports"), icon: BarChart3 },
    ...(user?.role === "ADMIN"
    ? [{ to: "/users", label: t("sidebar.users", "Empleados"), icon: UsersIcon }]
    : []),
    { to: "/settings", label: t("sidebar.settings", "Configuración"), icon: SettingsIcon },
    { to: "/suppliers", label: t("sidebar.suppliers", "Proveedores"), icon: Truck },
  ]

  return (
    <aside className={cn("flex flex-col justify-between bg-[#100E1F] w-64 min-h-screen p-4", className)}>
      <div>
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-sm text-white">
            IP
          </div>
          <span className="font-semibold text-lg">InventarioPro</span>
        </div>

        <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2">
          {t("sidebar.mainMenu", "Menú principal")}
        </p>
        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}