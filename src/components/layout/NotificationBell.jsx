// src/components/layout/NotificationBell.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Popover } from "@base-ui/react/popover";
import {
  Bell, CalendarClock, CheckCheck, CheckCircle2, ChevronRight, Hourglass, Inbox, PackageCheck, PackageMinus,
  ShoppingCart, XCircle,
} from "lucide-react";
import { useNotifications } from "@/hoocks/useNotifications";
import { markNotificationRead, markAllNotificationsRead } from "@/api/notifications";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Orden = urgencia. Para reordenar los grupos basta con mover una línea.
const SECTIONS = [
  { type: "requestRejected", icon: XCircle, tone: "crit" },
  { type: "requestApproved", icon: CheckCircle2, tone: "ok" },
  { type: "orderReceived", icon: PackageCheck, tone: "ok" },
  { type: "requestExpiring", icon: Hourglass, tone: "warn" },
  { type: "lowStock", icon: PackageMinus, tone: "crit" },
  { type: "productExpiring", icon: CalendarClock, tone: "warn" },
  { type: "pending", icon: Inbox, tone: "info" },
  { type: "approved", icon: ShoppingCart, tone: "info" },
];

const TONE = {
  crit: "bg-[color-mix(in_srgb,var(--stk-crit)_14%,transparent)] text-[var(--stk-crit)]",
  warn: "bg-[color-mix(in_srgb,var(--stk-warn)_16%,transparent)] text-[var(--stk-warn)]",
  ok: "bg-[color-mix(in_srgb,var(--stk-ok)_16%,transparent)] text-[var(--stk-ok)]",
  info: "bg-[var(--stk-lime-soft)] text-foreground",
};

const VISIBLE = 3;
const DAY = 86_400_000;

// Días de calendario hasta una fecha. La fecha de vencimiento de un producto es "solo día":
// se toma YYYY-MM-DD tal cual para que la zona horaria no la corra un día.
function daysUntil(value, dateOnly) {
  const target = dateOnly
    ? new Date(...value.slice(0, 10).split("-").map((n, i) => (i === 1 ? n - 1 : +n)))
    : new Date(value);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOf(target) - startOf(new Date())) / DAY);
}

function useDetail() {
  const { t } = useTranslation();
  const when = (days) => {
    if (days < 0) return t("notifications.when.past");
    if (days === 0) return t("notifications.when.today");
    if (days === 1) return t("notifications.when.tomorrow");
    return t("notifications.when.in_days", { count: days });
  };

  return (n) => {
    const m = n.meta ?? {};
    switch (n.type) {
      case "requestExpiring":
        return t("notifications.detail.requestExpiring", { ...m, when: when(daysUntil(m.expiresAt)) });
      case "productExpiring":
        return t("notifications.detail.productExpiring", { when: when(daysUntil(m.expirationDate, true)) });
      case "lowStock":
        return m.stock <= 0
          ? t("notifications.detail.lowStockOut", m)
          : t("notifications.detail.lowStock", m);
      default:
        return t(`notifications.detail.${n.type}`, m);
    }
  };
}

function Section({ section, items, onOpen }) {
  const { t } = useTranslation();
  const detailOf = useDetail();
  const [expanded, setExpanded] = useState(false);
  const Icon = section.icon;
  const shown = expanded ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;
  const headingId = `notif-${section.type}`;

  return (
    <section aria-labelledby={headingId} className="px-2 py-2">
      <div className="flex items-center gap-2 px-2 pb-1">
        <span className={cn("grid size-6 place-items-center rounded-md", TONE[section.tone])}>
          <Icon className="size-3.5" strokeWidth={1.9} aria-hidden />
        </span>
        <h3 id={headingId} className="flex-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t(`notifications.sections.${section.type}`)}
        </h3>
        <span className="text-xs font-medium text-muted-foreground tabular-nums">{items.length}</span>
      </div>

      <ul>
        {shown.map((n) => (
          <li key={n.id}>
            <Link
              to={n.link}
              onClick={() => onOpen(n)}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-muted focus-visible:bg-muted"
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm", n.persisted && !n.read ? "font-semibold" : "font-medium")}>{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{detailOf(n)}</span>
              </span>
              {n.persisted && !n.read && (
                <span className="size-2 shrink-0 rounded-full bg-primary" role="img" aria-label={t("notifications.unread")} />
              )}
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>

      {items.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-0.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          {expanded ? t("notifications.showLess") : t("notifications.showMore", { count: hidden })}
        </button>
      )}
    </section>
  );
}

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useNotifications();
  const notifications = data?.notifications ?? [];
  const total = notifications.length;
  const count = data?.unread ?? 0; // lo que pide atención: calculados + guardados sin leer
  const unreadStored = notifications.filter((n) => n.persisted && !n.read).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  const handleOpen = (n) => {
    if (n.persisted && !n.read) markRead.mutate(n.id);
    setOpen(false);
  };

  const groups = SECTIONS
    .map((section) => ({ section, items: notifications.filter((n) => n.type === section.type) }))
    .filter((g) => g.items.length > 0);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button className="stk-icon-btn" aria-label={t("notifications.bellLabel", { count })}>
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
            {count > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-destructive text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular-nums">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="isolate z-50 outline-none">
          <Popover.Popup
            aria-label={t("notifications.title")}
            className="flex max-h-[min(34rem,80vh)] w-[min(24rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">{t("notifications.title")}</h2>
              <div className="flex items-center gap-2">
                {unreadStored > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {t("notifications.markAllRead")}
                  </button>
                )}
                {count > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{count}</span>
                )}
              </div>
            </header>

            <div className="overflow-y-auto overscroll-contain py-1 [scrollbar-color:var(--muted-foreground)_transparent] [scrollbar-width:thin]">
              {isLoading ? (
                <div className="space-y-3 p-4" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("notifications.error")}</p>
              ) : total === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-[var(--stk-lime-soft)]">
                    <CheckCheck className="size-5" strokeWidth={1.7} aria-hidden />
                  </span>
                  <p className="text-sm font-medium">{t("notifications.empty")}</p>
                  <p className="text-xs text-muted-foreground">{t("notifications.emptyHint")}</p>
                </div>
              ) : (
                groups.map(({ section, items }, i) => (
                  <div key={section.type} className={i > 0 ? "border-t border-border" : undefined}>
                    <Section section={section} items={items} onOpen={handleOpen} />
                  </div>
                ))
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
