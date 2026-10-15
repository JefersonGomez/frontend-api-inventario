// src/pages/AuditLog.jsx
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Activity, ListChecks, Layers, Mail } from "lucide-react";
import { getAuditLogs, getAuditMetrics } from "@/api/auditLogs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const actionVariant = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  APPROVE: "default",
  REJECT: "destructive",
  RECEIVE: "default",
  ACTIVATE: "default",
  DEACTIVATE: "destructive",
  EMAIL: "secondary",
};

// "YYYY-MM-DD" en la zona horaria del navegador: la misma fecha que se ve en la tabla
const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold break-words">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const [entityFilter, setEntityFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const chartRef = useRef(null);

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["audit-metrics"],
    queryFn: getAuditMetrics,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    // "all" | "action:EMAIL" | nombre de entidad
    queryFn: () =>
      getAuditLogs(
        entityFilter === "all"
          ? {}
          : entityFilter.startsWith("action:")
            ? { action: entityFilter.slice(7) }
            : { entityType: entityFilter }
      ),
  });

  if (loadingMetrics || loadingLogs) return <div className="p-6">{t("common.loading")}</div>;

  // últimos 7 días (hoy incluido), con 0 en los días sin actividad
  const counts = {};
  for (const ts of metrics.recentActivity) counts[dayKey(ts)] = (counts[dayKey(ts)] ?? 0) + 1;
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    return { key, label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }), count: counts[key] ?? 0 };
  });

  const selected = logs.find((l) => l.id === selectedId) ?? null;
  const selectedPoint = selected && chartData.find((p) => p.key === dayKey(selected.createdAt));

  const selectRow = (id) => {
    setSelectedId((cur) => (cur === id ? null : id));
    // en pantallas chicas el gráfico queda arriba, fuera de vista
    chartRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const { emails } = metrics;
  const lastEmailHint = emails.last
    ? t("auditLog.lastEmail", {
        to: emails.last.changes?.to ?? "—",
        date: new Date(emails.last.createdAt).toLocaleDateString(),
      })
    : t("auditLog.noEmails");

  const topEntity = [...metrics.byEntityType].sort((a, b) => b.count - a.count)[0];
  const topAction = [...metrics.byAction].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("auditLog.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("auditLog.subtitle")}</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        <MetricCard icon={Activity} label={t("auditLog.totalActions")} value={metrics.totalCount} />
        <MetricCard
          icon={ListChecks}
          label={t("auditLog.actionsByType")}
          value={topAction ? `${t(`auditLog.action.${topAction.action}`)} (${topAction.count})` : "—"}
        />
        <MetricCard
          icon={Layers}
          label={t("auditLog.entitiesAffected")}
          value={topEntity ? `${topEntity.entityType} (${topEntity.count})` : "—"}
        />
        <MetricCard
          icon={Mail}
          label={t("auditLog.emailsSent")}
          value={emails.total}
          hint={emails.testMode > 0 ? `${t("auditLog.emailsTest", { count: emails.testMode })} · ${lastEmailHint}` : lastEmailHint}
        />
      </div>

      {/* Gráfico de tendencia */}
      <div ref={chartRef} className="rounded-xl border border-border bg-card p-5 scroll-mt-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-semibold">{t("auditLog.activityLast7Days")}</h3>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {!selected
              ? t("auditLog.selectHint")
              : selectedPoint
                ? t("auditLog.selectedDay", { day: selectedPoint.label, count: selectedPoint.count })
                : t("auditLog.selectedOutOfRange")}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={({ cx, cy, payload }) => {
                const on = payload.key === selectedPoint?.key;
                return (
                  <circle
                    key={payload.key}
                    cx={cx}
                    cy={cy}
                    r={on ? 7 : 3}
                    fill={on ? "var(--stk-accent)" : "var(--foreground)"}
                    stroke={on ? "var(--foreground)" : "none"}
                    strokeWidth={2}
                  />
                );
              }}
              isAnimationActive={false}
            />
            {selectedPoint && (
              <ReferenceLine x={selectedPoint.label} stroke="var(--stk-accent)" strokeWidth={2} strokeDasharray="4 3" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla filtrable */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{t("auditLog.title")}</h3>
          <Select
            items={[
              { value: "all", label: t("auditLog.allEntities") },
              { value: "action:EMAIL", label: t("auditLog.emailsFilter") },
              ...metrics.byEntityType.map((e) => ({ value: e.entityType, label: e.entityType })),
            ]}
            value={entityFilter}
            onValueChange={(v) => {
              setEntityFilter(v);
              setSelectedId(null);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("auditLog.filterByEntity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("auditLog.allEntities")}</SelectItem>
              <SelectItem value="action:EMAIL">{t("auditLog.emailsFilter")}</SelectItem>
              {metrics.byEntityType.map((e) => (
                <SelectItem key={e.entityType} value={e.entityType}>
                  {e.entityType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("auditLog.noLogs")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_th]:pr-3 [&_td]:pr-3 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2">{t("auditLog.user")}</th>
                  <th>{t("auditLog.action")}</th>
                  <th className="hidden sm:table-cell">{t("auditLog.entity")}</th>
                  <th className="hidden sm:table-cell">{t("auditLog.date")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const entity = log.action === "EMAIL" && log.changes?.to
                    ? `${log.entityType} → ${log.changes.to}`
                    : log.entityType;
                  return (
                    <tr
                      key={log.id}
                      tabIndex={0}
                      aria-selected={log.id === selectedId}
                      onClick={() => selectRow(log.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectRow(log.id);
                        }
                      }}
                      className={`cursor-pointer border-b border-border/50 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring ${
                        log.id === selectedId ? "bg-[var(--stk-accent-soft)]" : ""
                      }`}
                    >
                      <td className="py-2">
                        {log.user.name}
                        <span className="block text-xs text-muted-foreground sm:hidden">
                          {entity} · {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <Badge variant={actionVariant[log.action] ?? "secondary"}>
                          {t(`auditLog.action.${log.action}`)}
                        </Badge>
                      </td>
                      <td className="hidden sm:table-cell text-muted-foreground">{entity}</td>
                      <td className="hidden sm:table-cell text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}