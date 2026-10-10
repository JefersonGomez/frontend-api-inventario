import { api } from "./client";

// filters: { entityType?, action? }
export const getAuditLogs = (filters = {}) =>
  api.get("/audit-logs", { params: filters }).then((res) => res.data);

export const getAuditMetrics = () => api.get("/audit-logs/metrics").then((res) => res.data);