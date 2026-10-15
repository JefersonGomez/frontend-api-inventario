import { api } from "./client"

export const getCustomers = () => api.get("/customers").then((res) => res.data)
export const createCustomer = (data) => api.post("/customers", data).then((res) => res.data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then((res) => res.data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)
