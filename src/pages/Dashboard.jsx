import { useEffect, useId, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Box } from "lucide-react"
import { api } from "@/api/client"
import { getDashboard, getLowStockReport, getInventoryValueBreakdown } from "@/api/reports"
import { useAuth } from "@/context/AuthContext"
import { useMoney } from "@/hoocks/useMoney"
import { usePermissions } from "@/hoocks/usePermissions"
import "./Dashboard.css"

const num = new Intl.NumberFormat("es-CO")
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0)
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"

export function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const money = useMoney()
  const { can } = usePermissions()
  const reports = can("reports.view")
  const showValue = reports && can("costs.view")
  const [avatarBroken, setAvatarBroken] = useState(false)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // totales calculados en el servidor (antes se bajaban todos los productos y movimientos)
  const summary = useQuery({
    queryKey: ["reports", "dashboard", monthStart.toISOString()],
    queryFn: () => getDashboard(monthStart.toISOString()),
  })
  const lowStock = useQuery({ queryKey: ["reports", "low-stock"], queryFn: getLowStockReport, enabled: reports })
  const value = useQuery({
    queryKey: ["reports", "inventory-value-breakdown", 60],
    queryFn: () => getInventoryValueBreakdown(60),
    enabled: showValue,
  })

  const units = summary.data?.units ?? 0
  const dispatched = summary.data?.dispatchedSince ?? 0
  const sellThrough = pct(dispatched, dispatched + units)
  const activePct = pct(value.data?.activeValue ?? 0, value.data?.totalValue ?? 0)

  const count = (status) => summary.data?.requests?.[status] ?? 0
  const requestStats = [
    { key: "PENDING", tone: "warn" },
    { key: "APPROVED", tone: "ok" },
    { key: "REJECTED", tone: "crit" },
  ]

  const categories = summary.data?.stockByCategory ?? []
  const recent = summary.data?.recentMovements ?? []

  const low = lowStock.data ?? []
  const lowCoverage = pct(
    low.reduce((s, p) => s + p.stock, 0),
    low.reduce((s, p) => s + p.minStock, 0)
  )

  return (
    <div className="dash">
      <h1 className="sr-only">{t("dashboard.title")}</h1>

      <div className="dash-main">
        <section className="dash-kpis">
          {showValue && <article className="dash-kpi dash-kpi--dark">
            <div>
              <p className="dash-kpi-label">{t("dashboard.inventoryValue")}</p>
              <p className="dash-kpi-value">{money.compact(value.data?.totalValue ?? 0)}</p>
              <p className="dash-kpi-sub">{t("dashboard.inventoryUnits", { currency: money.currency, units: num.format(units) })}</p>
              {value.data?.productsWithoutCost > 0 && (
                <p className="dash-kpi-sub">
                  <Link to="/products">{t("dashboard.withoutCost", { count: value.data.productsWithoutCost })}</Link>
                </p>
              )}
            </div>
            <Ring
              value={activePct}
              size={76}
              stroke={8}
              track="rgba(255,255,255,.12)"
              color="#6aa7de"
              label={t("dashboard.activeRing", { pct: activePct })}
            >
              <span className="dash-ring-text">{activePct}%</span>
            </Ring>
          </article>}

          <article className="dash-kpi dash-kpi--accent">
            <div>
              <p className="dash-kpi-label">{t("dashboard.dispatched")}</p>
              <p className="dash-kpi-value">{num.format(dispatched)}</p>
              <p className="dash-kpi-sub">{t("dashboard.dispatchedSub", { pct: sellThrough })}</p>
            </div>
            <Ring
              value={sellThrough}
              size={76}
              stroke={8}
              track="rgba(255,255,255,.25)"
              color="var(--stk-accent-fg)"
              label={t("dashboard.dispatchedRing", { pct: sellThrough })}
            >
              <span className="dash-ring-text">{sellThrough}%</span>
            </Ring>
          </article>
        </section>

        <article className="stk-card">
          <header className="dash-card-head">
            <h2>{t("dashboard.stockByCategory")}</h2>
            <span className="dash-muted">{t("dashboard.unitsShort")}</span>
          </header>
          {categories.length ? (
            <BarChart data={categories} t={t} />
          ) : (
            <p className="dash-empty">{summary.isLoading ? "…" : t("dashboard.noData")}</p>
          )}
        </article>

        <article className="stk-card">
          <header className="dash-card-head">
            <h2>{t("dashboard.recent")}</h2>
            <Link to="/movements" className="dash-link">
              {t("dashboard.seeAll")}
            </Link>
          </header>
          {recent.length ? (
            <ul className="dash-moves">
              {recent.map((m) => (
                <li key={m.id}>
                  <span className="dash-thumb">
                    <Box className="w-4 h-4" strokeWidth={1.7} aria-hidden />
                  </span>
                  <span className="dash-move-name">
                    <span>{m.product?.name}</span>
                    <span className="dash-mono dash-muted">{m.product?.sku}</span>
                  </span>
                  <span className="dash-mono dash-move-qty">
                    {m.type === "OUT" ? "−" : "+"}
                    {num.format(m.quantity)} {t(`units.short.${m.product?.unit ?? "UNIT"}`)}
                  </span>
                  <MovementStatus movement={m} t={t} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-empty">{summary.isLoading ? "…" : t("dashboard.noMovements")}</p>
          )}
        </article>
      </div>

      <aside className="dash-side">
        <article className="stk-card dash-role">
          <span className="dash-avatar" title={user?.name} role="img" aria-label={user?.name}>
            {user?.avatarUrl && !avatarBroken ? (
              <img src={`${api.defaults.baseURL}${user.avatarUrl}`} alt="" onError={() => setAvatarBroken(true)} />
            ) : (
              initials(user?.name)
            )}
          </span>
          <span className="dash-role-text">{t(`dashboard.roles.${user?.role}`)}</span>
        </article>

        <article className="stk-card">
          <header className="dash-card-head">
            <h2>{t("dashboard.requestsTitle")}</h2>
            <Link to="/purchase-requests" className="dash-link">
              {t("dashboard.requestsSee")}
            </Link>
          </header>
          <ul className="dash-req">
            {requestStats.map(({ key, tone }) => (
              <li key={key}>
                <span className="dash-req-label">
                  <span className={`dash-dot dash-tone--${tone}`} aria-hidden />
                  {t(`dashboard.requests.${key}`)}
                </span>
                <span className={`dash-req-num dash-tone--${tone}`}>{summary.isLoading ? "…" : count(key)}</span>
              </li>
            ))}
          </ul>
        </article>

        {reports && <article className="stk-card dash-low">
          <header className="dash-card-head">
            <h2>{t("dashboard.lowStock")}</h2>
          </header>
          <p className="dash-low-count">{low.length}</p>
          {low.length ? (
            <>
              <ul className="dash-low-list">
                {low.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <span>{p.name}</span>
                    <span className="dash-mono">
                      <strong>{num.format(p.stock)}</strong> / {num.format(p.minStock)} {t(`units.short.${p.unit ?? "UNIT"}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className="dash-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={lowCoverage}
                aria-label={t("dashboard.lowStockCoverage", { pct: lowCoverage })}
              >
                <span style={{ width: `${lowCoverage}%` }} />
              </div>
              <p className="dash-muted dash-small">{t("dashboard.lowStockCoverage", { pct: lowCoverage })}</p>
              <p className="dash-small">{t("dashboard.lowStockHint")}</p>
              <Link to="/purchase-requests" className="stk-btn-accent">
                {t("dashboard.lowStockCta")}
              </Link>
            </>
          ) : (
            <p className="dash-muted dash-small">
              {lowStock.isLoading ? "…" : t("dashboard.lowStockNone")}
            </p>
          )}
        </article>}
      </aside>
    </div>
  )
}

function MovementStatus({ movement, t }) {
  const p = movement.product
  const [tone, key] =
    p && p.stock <= p.minStock
      ? ["crit", "low"]
      : movement.type === "IN"
        ? ["ok", "IN"]
        : ["neutral", movement.type]
  return (
    <span className={`dash-pill dash-pill--${tone}`}>
      <span className="dash-dot" aria-hidden />
      {t(`dashboard.status.${key}`)}
    </span>
  )
}

/** Anillo de progreso con el valor al centro. */
function Ring({ value, size, stroke, track, color, label, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = `${(Math.min(100, Math.max(0, value)) / 100) * c} ${c}`
  const circle = (props) => (
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeLinecap="round" {...props} />
  )
  return (
    <div className="dash-ring" style={{ width: size, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {circle({ stroke: track, strokeWidth: stroke, strokeLinecap: "butt" })}
          {value > 0 && circle({ stroke: color, strokeWidth: stroke, strokeDasharray: dash })}
        </g>
      </svg>
      <div className="dash-ring-center">{children}</div>
    </div>
  )
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)
}

/** Barras SVG a todo el ancho: el viewBox sigue el ancho del contenedor para que el texto no se escale. */
function BarChart({ data, t }) {
  const id = useId()
  const box = useRef(null)
  const [hover, setHover] = useState(null)
  const [W, setW] = useState(640)
  const H = 250, L = 40, R = 8, T = 10, B = 28

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const plotW = W - L - R, plotH = H - T - B
  const step = niceStep(Math.max(...data.map((d) => d.value), 1) / 5)
  const max = step * 5
  const y = (v) => T + plotH - (v / max) * plotH
  const colW = plotW / data.length
  const barW = Math.min(44, colW * 0.5)
  const maxChars = Math.max(6, Math.floor(colW / 7))

  return (
    <div className="dash-bars" ref={box}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t("dashboard.barsLabel", {
          values: data.map((d) => `${d.name} ${num.format(d.value)}`).join(", "),
        })}
      >
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="dash-stop-a" />
            <stop offset="1" className="dash-stop-b" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(i * step)} y2={y(i * step)} className="dash-grid" />
            <text x={L - 8} y={y(i * step)} dy="0.32em" textAnchor="end" className="dash-axis">
              {num.format(i * step)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + colW * i + colW / 2
          return (
            <g key={d.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={cx - barW / 2} y={T} width={barW} height={plotH} rx={barW / 2} className="dash-rail" />
              <rect
                x={cx - barW / 2}
                y={y(d.value)}
                width={barW}
                height={Math.max(y(0) - y(d.value), 0)}
                rx={barW / 2}
                fill={`url(#${id}g)`}
              />
              <text x={cx} y={H - 8} textAnchor="middle" className="dash-axis">
                {d.name.length > maxChars ? `${d.name.slice(0, maxChars - 1)}…` : d.name}
              </text>
              <rect x={L + colW * i} y={0} width={colW} height={H} fill="transparent" />
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="dash-tip" style={{ left: L + colW * hover + colW / 2, top: y(data[hover].value) }}>
          {t("dashboard.tooltip", { name: data[hover].name, value: num.format(data[hover].value) })}
        </div>
      )}
    </div>
  )
}
