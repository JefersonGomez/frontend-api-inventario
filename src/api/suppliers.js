import { api } from "./client"

export async function getSuppliers() {
  const response = await api.get("/suppliers/")
  return response.data
}

export async function createSupplier(data) {
  const response = await api.post("/suppliers/", data)
  return response.data
}

export async function updateSupplier(id, data) {
  const response = await api.put(`/suppliers/${id}`, data)
  return response.data
}

export async function deleteSupplier(id) {
  const response = await api.delete(`/suppliers/${id}`)
  return response.data
}