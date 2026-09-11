import { api } from "./client"

export async function getCategories() {
  const response = await api.get("/categories/")
  return response.data
}

export async function createCategory(name) {
  const response = await api.post("/categories/", { name })
  return response.data
}

export async function updateCategory(id, name) {
  const response = await api.put(`/categories/${id}`, { name })
  return response.data
}

export async function deleteCategory(id) {
  const response = await api.delete(`/categories/${id}`)
  return response.data
}