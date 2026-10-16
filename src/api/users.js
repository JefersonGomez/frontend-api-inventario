import { api } from "./client";

// sin page: todos los miembros; con { page, pageSize, q }: página
export const getUsers = (params = {}) => api.get("/users", { params }).then((res) => res.data)

export async function toggleUserActive(id) {
    const responce = await api.patch(`/users/${id}/toggle-active`)
    return responce.data
    
}
// catálogo de permisos y los de cada rol
export const getPermissionCatalog = () => api.get("/users/permissions").then((res) => res.data)

export const updateUserAccess = (id, { role, grantedPermissions, revokedPermissions }) =>
  api.patch(`/users/${id}/access`, { role, grantedPermissions, revokedPermissions }).then((res) => res.data)
