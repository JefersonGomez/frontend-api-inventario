import { api } from "./client";

// sin page: todos los miembros; con { page, pageSize, q }: página
export const getUsers = (params = {}) => api.get("/users", { params }).then((res) => res.data)

export async function toggleUserActive(id) {
    const responce = await api.patch(`/users/${id}/toggle-active`)
    return responce.data
    
}