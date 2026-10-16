import { api } from "./client"

// Sucursales y bodegas. Sin inactive: las activas que ve la persona; con inactive: también las desactivadas
export const getLocations = (inactive = false) =>
  api.get("/locations", { params: inactive ? { inactive: 1 } : {} }).then((res) => res.data)
export const createLocation = (data) => api.post("/locations", data).then((res) => res.data)
export const updateLocation = (id, data) => api.patch(`/locations/${id}`, data).then((res) => res.data)
