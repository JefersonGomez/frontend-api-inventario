import { api } from "./client";

export async function getUsers() {
    const responce = await api.get("/users/")
    return responce.data
}

export async function toggleUserActive(id) {
    const responce = await api.patch(`/users/${id}/toggle-active`)
    return responce.data
    
}