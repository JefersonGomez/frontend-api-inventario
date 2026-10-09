import { api } from "./client"

export const getNotifications = () => api.get("/notifications").then((res) => res.data)

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((res) => res.data)

export const markAllNotificationsRead = () =>
  api.patch("/notifications/read-all").then((res) => res.data)
