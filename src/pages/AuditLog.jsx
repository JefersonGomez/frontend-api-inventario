// src/pages/AuditLog.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, ListChecks, Layers } from "lucide-react";
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
};

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#221F3B] bg-[#151325] p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function AuditLogPage() {
  const { t } = useTranslation();
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ["audit-metrics"],
    queryFn: getAuditMetrics,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["audit-logs", entityFilter],
    queryFn: () => getAuditLogs(entityFilter === "all" ? undefined : entityFilter),
  });

  if (loadingMetrics || loadingLogs) return <div className="p-6">{t("common.loading")}</div>;

  // transformar activityByDay ({ "2026-09-15": 3, ... }) en array ordenado para recharts
  const chartData = Object.entries(metrics.activityByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      count,
    }));

  const topEntity = [...metrics.byEntityType].sort((a, b) => b.count - a.count)[0];
  const topAction = [...metrics.byAction].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("auditLog.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("auditLog.subtitle")}</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>

      {/* Gráfico de tendencia */}
      <div className="rounded-xl border border-[#221F3B] bg-[#151325] p-5">
        <h3 className="font-semibold mb-4">{t("auditLog.activityLast7Days")}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#221F3B" />
            <XAxis dataKey="date" stroke="#8B7CF6" fontSize={12} />
            <YAxis stroke="#8B7CF6" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#151325", border: "1px solid #221F3B", borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#8B7CF6"
              strokeWidth={2}
              dot={{ fill: "#8B7CF6", r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla filtrable */}
      <div className="rounded-xl border border-[#221F3B] bg-[#151325] p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{t("auditLog.title")}</h3>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("auditLog.filterByEntity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("auditLog.allEntities")}</SelectItem>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#221F3B]">
                  <th className="py-2">{t("auditLog.user")}</th>
                  <th>{t("auditLog.action")}</th>
                  <th>{t("auditLog.entity")}</th>
                  <th>{t("auditLog.date")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#221F3B]/50">
                    <td className="py-2">{log.user.name}</td>
                    <td>
                      <Badge variant={actionVariant[log.action] ?? "secondary"}>
                        {t(`auditLog.action.${log.action}`)}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">{log.entityType}</td>
                    <td className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}