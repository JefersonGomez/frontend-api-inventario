import { api } from "./client";

// { page, pageSize, q, entityType, action, from, to } → página
export const getAuditLogs = (filters = {}) =>
  api.get("/audit-logs", { params: filters }).then((res) => res.data);

export const getAuditMetrics = () => api.get("/audit-logs/metrics").then((res) => res.data);