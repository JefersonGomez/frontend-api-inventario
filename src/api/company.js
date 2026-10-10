import { api } from "./client"

export const getCompany = () => api.get("/company").then((res) => res.data)

export const updateCompany = (name) => api.put("/company", { name }).then((res) => res.data)
