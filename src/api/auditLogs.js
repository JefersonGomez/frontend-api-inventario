import { api } from "./client";

export const getAuditLogs = (entityType) =>
  api
    .get("/audit-logs", { params: entityType ? { entityType } : {} })
    .then((res) => res.data);

export const getAuditMetrics = () => api.get("/audit-logs/metrics").then((res) => res.data);