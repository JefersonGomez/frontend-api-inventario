import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { usePlatformOwner } from "@/hoocks/usePlatformOwner";
import { usePermissions } from "@/hoocks/usePermissions";
import { useQuery } from "@tanstack/react-query";
import { getLocations } from "@/api/locations";
import {
  LayoutDashboard, Package, FolderTree, ArrowLeftRight, Route, ClipboardCheck, Tag, BarChart3, ClipboardList, ShoppingCart,
  Settings as SettingsIcon, Users as UsersIcon, Truck, ShieldCheck, UserRound, LogOut, Box, ScanBarcode, Building2, Contact,
  Monitor, AlertTriangle, Calculator, HandCoins, Receipt, Menu, X, Pin, PinOff,
} from "lucide-react";

const ICON = { className: "w-[18px] h-[18px]", strokeWidth: 1.7, "aria-hidden": true };
const PIN_KEY = "stockly.sidebar.pinned";

// media query como estado de React
const useMedia = (query) =>
  useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches
  );

const readPinned = () => {
  try {
    return localStorage.getItem(PIN_KEY) === "1";
  } catch {
    return false;
  }
};

// Una sola pastilla que viaja entre los enlaces (la del mouse y la de la página actual), en vez de que
// cada enlace se pinte por su cuenta. Se mueve con transform; aparece en su lugar sin deslizarse.
function place(el, link, animate) {
  if (!el) return;
  if (!link) {
    el.dataset.on = "";
    return;
  }
  if (!animate || !el.dataset.on) {
    el.style.transition = "none";
    el.style.transform = `translateY(${link.offsetTop}px)`;
    el.style.height = `${link.offsetHeight}px`;
    void el.offsetHeight; // aplica la posición antes de volver a encender la transición
    el.style.transition = "";
  } else {
    el.style.transform = `translateY(${link.offsetTop}px)`;
    el.style.height = `${link.offsetHeight}px`;
  }
  el.dataset.on = "1";
}

function GlideList({ className, children, pathname }) {
  const box = useRef(null);
  const hover = useRef(null);
  const active = useRef(null);
  // la página actual: la pastilla viaja al enlace nuevo al navegar
  useLayoutEffect(() => {
    place(active.current, box.current?.querySelector('.stk-link[aria-current="page"]'), true);
  }, [pathname, children]);
  return (
    <div
      ref={box}
      className={className}
      onPointerOver={(e) => place(hover.current, e.target.closest?.(".stk-link"), true)}
      onPointerLeave={() => place(hover.current, null)}
    >
      <span ref={active} className="stk-glide stk-glide-active" aria-hidden />
      <span ref={hover} className="stk-glide stk-glide-hover" aria-hidden />
      {children}
    </div>
  );
}

// Riel de íconos: al pasar el mouse (o llegar con el teclado) se despliega encima del contenido sin
// moverlo; el pin lo deja abierto (y entonces sí ocupa su espacio). En tablets sin mouse queda abierto.
// En el celular es un botón de menú que abre el mismo panel.
export function Sidebar() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: () => getLocations() });
  const { isPlatformOwner } = usePlatformOwner();

  const isMobile = useMedia("(max-width: 760px)");
  const canHover = useMedia("(hover: hover) and (pointer: fine)");
  const [pinned, setPinned] = useState(readPinned);
  const [hovering, setHovering] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timer = useRef(null);
  const menuButton = useRef(null);
  const closeButton = useRef(null);

  const wide = !isMobile && (pinned || !canHover); // ocupa su espacio (no se despliega encima)
  const expanded = isMobile ? mobileOpen : wide || hovering;

  // un respiro al entrar y al salir: pasar el mouse de largo no lo abre ni lo hace parpadear
  const intent = (open, ms) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setHovering(open), ms);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // celular: se cierra al navegar o con Escape, y el foco vuelve al botón de menú
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    if (!mobileOpen) return;
    const opener = menuButton.current;
    closeButton.current?.focus();
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [mobileOpen]);

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    try {
      localStorage.setItem(PIN_KEY, next ? "1" : "0");
    } catch {
      // sin almacenamiento: queda solo para esta visita
    }
  }

  const all = (...items) => items.filter(Boolean);
  // el dueño de la plataforma no usa el inventario de un cliente: solo ve la plataforma
  const groups = isPlatformOwner
    ? [{ id: "platform", items: [{ to: "/platform", label: t("sidebar.platform"), icon: Building2 }] }]
    : [
        { id: "home", items: [{ to: "/", label: t("sidebar.dashboard"), icon: LayoutDashboard }] },
        {
          id: "sales",
          title: t("sidebar.groups.sales"),
          items: all(
            can("sales.sell") && can("cash.manage") && { to: "/pos/abrir", label: t("sidebar.pos"), icon: Monitor },
            (can("sales.sell") || can("sales.void") || can("reports.view")) && { to: "/sales", label: t("sidebar.sales"), icon: Receipt },
            can("cash.reconcile") && { to: "/cash-closings", label: t("sidebar.cashClosings"), icon: Calculator },
            { to: "/customers", label: t("sidebar.customers"), icon: Contact },
            can("receivables.manage") && { to: "/receivables", label: t("sidebar.receivables"), icon: HandCoins },
          ),
        },
        {
          id: "inventory",
          title: t("sidebar.groups.inventory"),
          items: all(
            { to: "/products", label: t("sidebar.products"), icon: Package },
            { to: "/categories", label: t("sidebar.categories"), icon: FolderTree },
            { to: "/movements", label: t("sidebar.movements"), icon: ArrowLeftRight },
            // escanear: abre el registro de movimiento con la cámara lista (es una acción, no una página)
            can("stock.move") && { to: "/movements?scan=1", label: t("sidebar.scanButton"), icon: ScanBarcode, action: true },
            // transferencias: solo tiene sentido con más de una ubicación
            can("stock.move") && locations.length > 1 && { to: "/transfers", label: t("sidebar.transfers"), icon: Route },
            can("stock.move") && { to: "/stock-counts", label: t("sidebar.stockCounts"), icon: ClipboardCheck },
            can("stock.move") && { to: "/labels", label: t("sidebar.labels"), icon: Tag },
            can("stock.move") && { to: "/negatives", label: t("sidebar.negatives"), icon: AlertTriangle },
          ),
        },
        {
          id: "purchases",
          title: t("sidebar.groups.purchases"),
          items: all(
            { to: "/purchase-requests", label: t("sidebar.purchaseRequests"), icon: ClipboardList },
            can("purchases.manage") && { to: "/purchase-orders", label: t("sidebar.purchaseOrders"), icon: ShoppingCart },
            { to: "/suppliers", label: t("sidebar.suppliers"), icon: Truck },
          ),
        },
        {
          id: "admin",
          title: t("sidebar.groups.admin"),
          items: all(
            can("reports.view") && { to: "/reports", label: t("sidebar.reports"), icon: BarChart3 },
            can("users.manage") && { to: "/users", label: t("sidebar.users"), icon: UsersIcon },
            can("audit.view") && { to: "/audit-log", label: t("sidebar.auditLog"), icon: ShieldCheck },
          ),
        },
      ].filter((g) => g.items.length);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  let n = 0; // orden de cada etiqueta para el escalonado al desplegarse
  const label = (text) => (
    <span className="stk-label" style={{ "--i": n++ }}>
      {text}
    </span>
  );

  return (
    <aside
      className="stk-side"
      data-expanded={expanded}
      data-wide={wide}
      onPointerEnter={(e) => !wide && !isMobile && e.pointerType === "mouse" && intent(true, 90)}
      onPointerLeave={() => !wide && !isMobile && intent(false, 240)}
      onFocus={() => !wide && !isMobile && intent(true, 0)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && intent(false, 0)}
      onKeyDown={(e) => e.key === "Escape" && !wide && !isMobile && setHovering(false)}
    >
      <div className="stk-mobile-bar">
        <Link to={isPlatformOwner ? "/platform" : "/"} className="stk-logo">
          <span className="stk-logo-mark">
            <Box className="w-5 h-5" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="stk-logo-text">Stockly</span>
        </Link>
        <button
          ref={menuButton}
          type="button"
          className="stk-icon-btn"
          aria-expanded={mobileOpen}
          aria-controls="stk-nav"
          aria-label={t("sidebar.openMenu")}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" strokeWidth={1.7} aria-hidden />
        </button>
      </div>
      {isMobile && mobileOpen && <div className="stk-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />}

      <nav id="stk-nav" className="stk-navpanel" aria-label={t("sidebar.mainMenu")} inert={(isMobile && !mobileOpen) || undefined}>
        <div className="stk-panel-head">
          <Link to={isPlatformOwner ? "/platform" : "/"} className="stk-logo">
            <span className="stk-logo-mark">
              <Box className="w-5 h-5" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="stk-logo-text stk-label" style={{ "--i": 0 }}>Stockly</span>
          </Link>
          {isMobile ? (
            <button ref={closeButton} type="button" className="stk-head-btn" aria-label={t("sidebar.closeMenu")} onClick={() => setMobileOpen(false)}>
              <X {...ICON} />
            </button>
          ) : (
            canHover && (
              <button
                type="button"
                className="stk-head-btn"
                aria-pressed={pinned}
                aria-label={pinned ? t("sidebar.unpin") : t("sidebar.pin")}
                title={pinned ? t("sidebar.unpin") : t("sidebar.pin")}
                onClick={togglePin}
              >
                {pinned ? <PinOff {...ICON} /> : <Pin {...ICON} />}
              </button>
            )
          )}
        </div>

        <GlideList className="stk-nav-list" pathname={pathname}>
          {groups.map((g) => (
            <div key={g.id} role="group" aria-labelledby={g.title ? `stk-group-${g.id}` : undefined} className="stk-group">
              {g.title && (
                <p id={`stk-group-${g.id}`} className="stk-group-title">
                  {label(g.title)}
                </p>
              )}
              {g.items.map(({ to, label: text, icon: Icon, action }) =>
                action ? (
                  <Link key={to} to={to} className="stk-link" title={expanded ? undefined : text}>
                    <Icon {...ICON} />
                    {label(text)}
                  </Link>
                ) : (
                  <NavLink key={to} to={to} end={to === "/"} className="stk-link" title={expanded ? undefined : text}>
                    <Icon {...ICON} />
                    {label(text)}
                  </NavLink>
                )
              )}
            </div>
          ))}
        </GlideList>

        <GlideList className="stk-nav-foot" pathname={pathname}>
          <NavLink to="/settings" className="stk-link" title={expanded ? undefined : t("sidebar.settings")}>
            <SettingsIcon {...ICON} />
            {label(t("sidebar.settings"))}
          </NavLink>
          <NavLink to="/profile" className="stk-link" title={expanded ? undefined : t("topbar.profile")}>
            <UserRound {...ICON} />
            {label(t("topbar.profile"))}
          </NavLink>
          <button type="button" className="stk-link" onClick={handleLogout} title={expanded ? undefined : t("topbar.logout")}>
            <LogOut {...ICON} />
            {label(t("topbar.logout"))}
          </button>
        </GlideList>
      </nav>
    </aside>
  );
}
