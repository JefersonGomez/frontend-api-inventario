import { api } from "./client";
// { page, pageSize, q, type, source, productId, from, to } → página
export const getMovements = (params = {}) => api.get("/movements", { params }).then((res) => res.data)

export async function createMovement(data) {
  const response = await api.post("/movements/", data)
  return response.data
}

