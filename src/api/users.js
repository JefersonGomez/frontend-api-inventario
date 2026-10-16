import { api } from "./client";

// sin page: todos los miembros; con { page, pageSize, q }: página
export const getUsers = (params = {}) => api.get("/users", { params }).then((res) => res.data)

export async function toggleUserActive(id) {
    const responce = await api.patch(`/users/${id}/toggle-active`)
    return responce.data
    
}
// catálogo de permisos y los de cada rol
export const getPermissionCatalog = () => api.get("/users/permissions").then((res) => res.data)

// códigos de caja del equipo: a quién puedo asignárselo y en qué estado está
export const getCashCodeTeam = () => api.get("/users/cash-codes").then((res) => res.data)

// asigna el código de caja de alguien (sin pin = al azar); la respuesta { pin } es la única vez que se ve
export const assignUserPin = (id, pin) => api.post(`/users/${id}/pin`, pin ? { pin } : undefined).then((res) => res.data)

export const updateUserAccess = (id, { role, grantedPermissions, revokedPermissions, locationIds }) =>
  api.patch(`/users/${id}/access`, { role, grantedPermissions, revokedPermissions, locationIds }).then((res) => res.data)
