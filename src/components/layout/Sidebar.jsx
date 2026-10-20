import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { usePlatformOwner } from "@/hoocks/usePlatformOwner";
import { usePermissions } from "@/hoocks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { getLocations } from "@/api/locations";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ArrowLeftRight,
  Route,
  ClipboardCheck,
  Tag,
  BarChart3,
  ClipboardList,
  ShoppingCart,
  Settings as SettingsIcon,
  Users as UsersIcon,
  Truck,
  ShieldCheck,
  UserRound,
  LogOut,
  Box,
  ScanBarcode,
  Building2,
  Contact, Monitor, AlertTriangle, Calculator } from "lucide-react";

const ICON = { className: "w-[18px] h-[18px]", strokeWidth: 1.7, "aria-hidden": true };

export function Sidebar() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() });
  const { isPlatformOwner } = usePlatformOwner();

  // el dueño de la plataforma no usa el inventario de un cliente: solo ve la plataforma
  const navItems = isPlatformOwner ? [{ to: "/platform", label: t("sidebar.platform"), icon: Building2 }] : [
    { to: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    ...(can("sales.sell") && can("cash.manage") ? [{ to: "/pos/abrir", label: t("sidebar.pos"), icon: Monitor }] : []),
    ...(can("cash.reconcile") ? [{ to: "/cash-closings", label: t("sidebar.cashClosings"), icon: Calculator }] : []),
    { to: "/products", label: t("sidebar.products"), icon: Package },
    { to: "/categories", label: t("sidebar.categories"), icon: FolderTree },
    { to: "/movements", label: t("sidebar.movements"), icon: ArrowLeftRight },
    // transferencias: solo tiene sentido con más de una ubicación
    ...(can("stock.move") && locations.length > 1 ? [{ to: "/transfers", label: t("sidebar.transfers"), icon: Route }] : []),
    ...(can("stock.move") ? [{ to: "/stock-counts", label: t("sidebar.stockCounts"), icon: ClipboardCheck }] : []),
    ...(can("stock.move") ? [{ to: "/labels", label: t("sidebar.labels"), icon: Tag }] : []),
    ...(can("stock.move") ? [{ to: "/negatives", label: t("sidebar.negatives"), icon: AlertTriangle }] : []),
    { to: "/purchase-requests", label: t("sidebar.purchaseRequests"), icon: ClipboardList },
    ...(can("purchases.manage") ? [{ to: "/purchase-orders", label: t("sidebar.purchaseOrders"), icon: ShoppingCart }] : []),
    { to: "/customers", label: t("sidebar.customers"), icon: Contact },
    { to: "/suppliers", label: t("sidebar.suppliers"), icon: Truck },
    ...(can("reports.view") ? [{ to: "/reports", label: t("sidebar.reports"), icon: BarChart3 }] : []),
    ...(can("users.manage") ? [{ to: "/users", label: t("sidebar.users"), icon: UsersIcon }] : []),
    ...(can("audit.view") ? [{ to: "/audit-log", label: t("sidebar.auditLog"), icon: ShieldCheck }] : []),
  ];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside className="stk-side">
      <nav className="stk-card stk-nav" aria-label={t("sidebar.mainMenu")}>
        <Link to={isPlatformOwner ? "/platform" : "/"} className="stk-logo">
          <span className="stk-logo-mark">
            <Box className="w-5 h-5" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="stk-logo-text">Stockly</span>
        </Link>

        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className="stk-link">
            <Icon {...ICON} />
            {label}
          </NavLink>
        ))}

        <div className="stk-sep" role="separator" />

        <NavLink to="/settings" className="stk-link">
          <SettingsIcon {...ICON} />
          {t("sidebar.settings")}
        </NavLink>
        <NavLink to="/profile" className="stk-link">
          <UserRound {...ICON} />
          {t("topbar.profile")}
        </NavLink>
        <button type="button" className="stk-link" onClick={handleLogout}>
          <LogOut {...ICON} />
          {t("topbar.logout")}
        </button>
      </nav>

      {!isPlatformOwner && (
      <div className="stk-card stk-promo">
        <span className="stk-promo-icon">
          <ScanBarcode className="w-[22px] h-[22px]" strokeWidth={1.7} aria-hidden />
        </span>
        <p>{t("sidebar.scanText")}</p>
        <Link to="/movements" className="stk-btn-accent">
          {t("sidebar.scanButton")}
        </Link>
      </div>
      )}
    </aside>
  );
}
