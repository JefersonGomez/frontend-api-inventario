import {api} from "./client"

export async function getProducts() {
    const responce = await api.get("/products/")
    return responce.data
}
export async function createProduct(data) {
  const response = await api.post("/products/", data)
  return response.data
}

export async function updateProduct(id, data) {
  const response = await api.put(`/products/${id}`, data)
  return response.data
}

export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`)
  return response.data
}