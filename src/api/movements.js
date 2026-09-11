import { api } from "./client";
export async function getMovements() {
    const responce = await api.get("/movements/")
    return responce.data
}

export async function createMovement(data) {
  const response = await api.post("/movements/", data)
  return response.data
}

