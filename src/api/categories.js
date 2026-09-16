import { api } from "./client"

export async function getCategories() {
  const response = await api.get("/categories")
  return response.data
}

export async function createCategory(name, description) {
  // ✅ Enviar la propiedad como 'name', que es lo que exige el validador
  const response = await api.post("/categories", { name, description })
  return response.data
}

export async function updateCategory(id, name, description) {
  const response = await api.put(`/categories/${id}`, { name, description })
  return response.data
}

export async function deleteCategory(id) {
  const response = await api.delete(`/categories/${id}`)
  return response.data
}