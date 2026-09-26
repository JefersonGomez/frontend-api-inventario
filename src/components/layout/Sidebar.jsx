import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  ShoppingCart,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Truck,
  ShieldCheck,
} from "lucide-react";

export function Sidebar({ className }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const navItems = [
    { to: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    { to: "/products", label: t("sidebar.products"), icon: Package },
    { to: "/categories", label: t("sidebar.categories"), icon: FolderTree },
    { to: "/movements", label: t("sidebar.movements"), icon: ArrowLeftRight },
    { to: "/reports", label: t("sidebar.reports"), icon: BarChart3 },
    ...(user?.role === "ADMIN"
      ? [{ to: "/users", label: t("sidebar.users", "Empleados"), icon: UsersIcon }]
      : []),
    { to: "/suppliers", label: t("sidebar.suppliers", "Proveedores"), icon: Truck },
    {
      to: "/purchase-requests",
      label: t("sidebar.purchaseRequests", "Solicitudes de compra"),
      icon: ClipboardList,
    },
    ...(user?.role === "ADMIN"
      ? [{ to: "/audit-log", label: t("sidebar.auditLog", "Auditoría"), icon: ShieldCheck }]
      : []),
    ...(user?.role === "ADMIN"
      ? [
          {
            to: "/purchase-orders",
            label: t("sidebar.purchaseOrders", "Órdenes de compra"),
            icon: ShoppingCart,
          },
        ]
      : []),
    { to: "/settings", label: t("sidebar.settings", "Configuración"), icon: SettingsIcon },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col justify-between bg-[#100E1F] w-64 min-h-screen p-4",
        className
      )}
    >
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
                  "flex items-center justify-between gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5"
                )
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}