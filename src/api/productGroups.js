import { api } from "./client"

// productos base (agrupan variantes): { name, attributeNames: ["Talla", "Color"] }
export const getProductGroups = () => api.get("/product-groups").then((res) => res.data)
export const createProductGroup = (data) => api.post("/product-groups", data).then((res) => res.data)
export const updateProductGroup = (id, data) => api.put(`/product-groups/${id}`, data).then((res) => res.data)
export const deleteProductGroup = (id) => api.delete(`/product-groups/${id}`)
