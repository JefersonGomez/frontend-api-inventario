import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
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
  UserRound,
  LogOut,
  Box,
  ScanBarcode,
} from "lucide-react";

const ICON = { className: "w-[18px] h-[18px]", strokeWidth: 1.7, "aria-hidden": true };

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const navItems = [
    { to: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    { to: "/products", label: t("sidebar.products"), icon: Package },
    { to: "/categories", label: t("sidebar.categories"), icon: FolderTree },
    { to: "/movements", label: t("sidebar.movements"), icon: ArrowLeftRight },
    { to: "/purchase-requests", label: t("sidebar.purchaseRequests"), icon: ClipboardList },
    ...(isAdmin ? [{ to: "/purchase-orders", label: t("sidebar.purchaseOrders"), icon: ShoppingCart }] : []),
    { to: "/suppliers", label: t("sidebar.suppliers"), icon: Truck },
    { to: "/reports", label: t("sidebar.reports"), icon: BarChart3 },
    ...(isAdmin
      ? [
          { to: "/users", label: t("sidebar.users"), icon: UsersIcon },
          { to: "/audit-log", label: t("sidebar.auditLog"), icon: ShieldCheck },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside className="stk-side">
      <nav className="stk-card stk-nav" aria-label={t("sidebar.mainMenu")}>
        <Link to="/" className="stk-logo">
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

      <div className="stk-card stk-promo">
        <span className="stk-promo-icon">
          <ScanBarcode className="w-[22px] h-[22px]" strokeWidth={1.7} aria-hidden />
        </span>
        <p>{t("sidebar.scanText")}</p>
        <Link to="/movements" className="stk-btn-lime">
          {t("sidebar.scanButton")}
        </Link>
      </div>
    </aside>
  );
}
