import { api } from "./client"

export async function getProfile() {
  const response = await api.get("/profile/me")
  return response.data
}

export async function updateAvatar(file) {
  const formData = new FormData()
  formData.append("avatar", file)

  const response = await api.post("/profile/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return response.data
}

export async function changePassword(currentPassword, newPassword) {
  const response = await api.put("/profile/me/password", { currentPassword, newPassword })
  return response.data
}

export async function updateProfile(name,email) {
  const responce = await api.put("/profile/me",{name,email})
  return responce.data
}