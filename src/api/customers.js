import { api } from "./client"

// sin page: lista completa; con { page, pageSize, q }: página
export const getCustomers = (params = {}) => api.get("/customers", { params }).then((res) => res.data)
export const createCustomer = (data) => api.post("/customers", data).then((res) => res.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((res) => res.data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)
