import { useId, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Box, UserRound, ArrowLeftRight, BarChart3 } from "lucide-react"
import { api } from "@/api/client"
import { getProducts } from "@/api/products"
import { getMovements } from "@/api/movements"
import { getUsers } from "@/api/users"
import { getPurchaseRequests } from "@/api/PurchaseRequests"
import { getLowStockReport, getInventoryValueBreakdown } from "@/api/reports"
import { aggregateStockByCategory } from "@/lib/chart-utils"
import { useAuth } from "@/context/AuthContext"
import "./Dashboard.css"

const num = new Intl.NumberFormat("es-CO")
const money = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 })
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0)
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"

export function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"
  const [avatarBroken, setAvatarBroken] = useState(false)

  const products = useQuery({ queryKey: ["products"], queryFn: getProducts })
  const movements = useQuery({ queryKey: ["movements"], queryFn: getMovements })
  const lowStock = useQuery({ queryKey: ["reports", "low-stock"], queryFn: getLowStockReport })
  const value = useQuery({
    queryKey: ["reports", "inventory-value-breakdown", 60],
    queryFn: () => getInventoryValueBreakdown(60),
  })
  const requests = useQuery({ queryKey: ["purchase-requests"], queryFn: getPurchaseRequests })
  const users = useQuery({ queryKey: ["users"], queryFn: getUsers, enabled: isAdmin })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthName = now.toLocaleDateString(i18n.language, { month: "long" })
  const inMonth = (d) => new Date(d) >= monthStart

  // ponytail: agregados calculados en el cliente sobre todos los movimientos; pasar a un endpoint de resumen si el volumen crece
  const units = (products.data ?? []).reduce((s, p) => s + (p.stock || 0), 0)
  const dispatched = (movements.data ?? [])
    .filter((m) => m.type === "OUT" && inMonth(m.createdAt))
    .reduce((s, m) => s + m.quantity, 0)
  const sellThrough = pct(dispatched, dispatched + units)
  const activePct = pct(value.data?.activeValue ?? 0, value.data?.totalValue ?? 0)

  const monthRequests = (requests.data ?? []).filter((r) => inMonth(r.createdAt))
  const attended = monthRequests.filter((r) => r.status !== "PENDING").length

  const categories = aggregateStockByCategory(products.data)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const recent = [...(movements.data ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const low = lowStock.data ?? []
  const lowCoverage = pct(
    low.reduce((s, p) => s + p.stock, 0),
    low.reduce((s, p) => s + p.minStock, 0)
  )

  const team = (users.data ?? []).filter((u) => u.isActive && u.id !== user?.id).slice(0, 3)

  return (
    <div className="dash">
      <h1 className="sr-only">{t("dashboard.title")}</h1>

      <div className="dash-main">
        <section className="dash-kpis">
          <article className="dash-kpi dash-kpi--dark">
            <div>
              <p className="dash-kpi-label">{t("dashboard.inventoryValue")}</p>
              <p className="dash-kpi-value">${money.format(value.data?.totalValue ?? 0)}</p>
              <p className="dash-kpi-sub">{t("dashboard.inventoryUnits", { units: num.format(units) })}</p>
            </div>
            <Ring
              value={activePct}
              size={76}
              stroke={8}
              track="rgba(255,255,255,.12)"
              color="var(--stk-lime)"
              label={t("dashboard.activeRing", { pct: activePct })}
            >
              <span className="dash-ring-text">{activePct}%</span>
            </Ring>
          </article>

          <article className="dash-kpi dash-kpi--lime">
            <div>
              <p className="dash-kpi-label">{t("dashboard.dispatched")}</p>
              <p className="dash-kpi-value">{num.format(dispatched)}</p>
              <p className="dash-kpi-sub">{t("dashboard.dispatchedSub", { pct: sellThrough })}</p>
            </div>
            <Ring
              value={sellThrough}
              size={76}
              stroke={8}
              track="rgba(0,0,0,.12)"
              color="#161615"
              label={t("dashboard.dispatchedRing", { pct: sellThrough })}
            >
              <span className="dash-ring-text">{sellThrough}%</span>
            </Ring>
          </article>
        </section>

        <section className="dash-charts">
          <article className="stk-card">
            <header className="dash-card-head">
              <h2>{t("dashboard.stockByCategory")}</h2>
              <span className="dash-muted">{t("dashboard.unitsShort")}</span>
            </header>
            {categories.length ? (
              <BarChart data={categories} t={t} />
            ) : (
              <p className="dash-empty">{products.isLoading ? "…" : t("dashboard.noData")}</p>
            )}
          </article>

          <article className="stk-card">
            <header className="dash-card-head">
              <h2>{t("dashboard.requestsTitle")}</h2>
              <span className="dash-muted dash-cap">{monthName}</span>
            </header>
            {monthRequests.length ? (
              <div className="dash-donut">
                <Ring
                  value={pct(attended, monthRequests.length)}
                  size={150}
                  stroke={16}
                  track="var(--border)"
                  color="var(--foreground)"
                  overlay="var(--stk-lime)"
                  label={`${t("dashboard.requestsTitle")}: ${pct(attended, monthRequests.length)}%`}
                >
                  <span className="dash-donut-value">{pct(attended, monthRequests.length)}%</span>
                </Ring>
                <ul className="dash-legend">
                  <li>
                    <span className="dash-dot" style={{ background: "var(--foreground)" }} />
                    <span>
                      <strong>{t("dashboard.requestsDone")}</strong>
                      {t("dashboard.requestsDoneDetail", { done: attended, total: monthRequests.length })}
                    </span>
                  </li>
                  <li>
                    <span className="dash-dot" style={{ background: "var(--border)" }} />
                    <span>
                      <strong>{t("dashboard.requestsPending")}</strong>
                      {t("dashboard.requestsPendingDetail", { count: monthRequests.length - attended })}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <p className="dash-empty">{requests.isLoading ? "…" : t("dashboard.requestsEmpty")}</p>
            )}
          </article>
        </section>

        <article className="stk-card">
          <header className="dash-card-head">
            <h2>{t("dashboard.recent")}</h2>
            <Link to="/movements" className="dash-link">
              {t("dashboard.seeAll")}
            </Link>
          </header>
          {recent.length ? (
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.table.product")}</th>
                    <th>{t("dashboard.table.sku")}</th>
                    <th className="dash-right">{t("dashboard.table.quantity")}</th>
                    <th>{t("dashboard.table.user")}</th>
                    <th>{t("dashboard.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="dash-prod">
                          <span className="dash-thumb">
                            <Box className="w-4 h-4" strokeWidth={1.7} aria-hidden />
                          </span>
                          {m.product?.name}
                        </span>
                      </td>
                      <td className="dash-mono">{m.product?.sku}</td>
                      <td className="dash-mono dash-right">
                        {m.type === "OUT" ? "−" : "+"}
                        {num.format(m.quantity)}
                      </td>
                      <td>{m.user?.name ?? "—"}</td>
                      <td>
                        <MovementStatus movement={m} t={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="dash-empty">{movements.isLoading ? "…" : t("dashboard.noMovements")}</p>
          )}
        </article>
      </div>

      <aside className="dash-side">
        <article className="stk-card dash-profile">
          <span className="dash-avatar dash-avatar--lg">
            {user?.avatarUrl && !avatarBroken ? (
              <img src={`${api.defaults.baseURL}${user.avatarUrl}`} alt="" onError={() => setAvatarBroken(true)} />
            ) : (
              initials(user?.name)
            )}
          </span>
          <p className="dash-profile-name">{user?.name}</p>
          <p className="dash-muted">{t(`dashboard.roles.${user?.role}`)}</p>
          <div className="dash-actions">
            <Link to="/profile" className="dash-action" aria-label={t("dashboard.actions.profile")} title={t("dashboard.actions.profile")}>
              <UserRound className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
            </Link>
            <Link to="/movements" className="dash-action" aria-label={t("dashboard.actions.movements")} title={t("dashboard.actions.movements")}>
              <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
            </Link>
            <Link to="/reports" className="dash-action" aria-label={t("dashboard.actions.reports")} title={t("dashboard.actions.reports")}>
              <BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
            </Link>
          </div>

          {isAdmin && team.length > 0 && (
            <div className="dash-team">
              <header className="dash-card-head">
                <h3>{t("dashboard.team")}</h3>
                <Link to="/users" className="dash-link">
                  {t("dashboard.seeAll")}
                </Link>
              </header>
              <ul>
                {team.map((u) => (
                  <li key={u.id}>
                    <span className="dash-avatar">{initials(u.name)}</span>
                    <span className="dash-team-text">
                      <span>{u.name}</span>
                      <span className="dash-muted">{t(`dashboard.roles.${u.role}`)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="stk-card dash-low">
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
                      <strong>{num.format(p.stock)}</strong> / {num.format(p.minStock)}
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
              <Link to="/purchase-requests" className="stk-btn-lime">
                {t("dashboard.lowStockCta")}
              </Link>
            </>
          ) : (
            <p className="dash-muted dash-small">
              {lowStock.isLoading ? "…" : t("dashboard.lowStockNone")}
            </p>
          )}
        </article>
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

/** Anillo de progreso. `overlay` dibuja una línea fina encima del arco (dona del prompt). */
function Ring({ value, size, stroke, track, color, overlay, label, children }) {
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
          {value > 0 && overlay && circle({ stroke: overlay, strokeWidth: 6, strokeDasharray: dash })}
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

function BarChart({ data, t }) {
  const id = useId()
  const [hover, setHover] = useState(null)
  const W = 360, H = 210, L = 36, R = 6, T = 10, B = 26
  const plotW = W - L - R, plotH = H - T - B
  const step = niceStep(Math.max(...data.map((d) => d.value), 1) / 5)
  const max = step * 5
  const y = (v) => T + plotH - (v / max) * plotH
  const colW = plotW / data.length
  const barW = Math.min(30, colW * 0.46)

  return (
    <div className="dash-bars">
      <svg
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
                {d.name.length > 10 ? `${d.name.slice(0, 9)}…` : d.name}
              </text>
              <rect x={L + colW * i} y={0} width={colW} height={H} fill="transparent" />
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="dash-tip"
          style={{
            left: `${((L + colW * hover + colW / 2) / W) * 100}%`,
            top: `${(y(data[hover].value) / H) * 100}%`,
          }}
        >
          {t("dashboard.tooltip", { name: data[hover].name, value: num.format(data[hover].value) })}
        </div>
      )}
    </div>
  )
}
