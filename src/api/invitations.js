import { api } from "./client"

// admin de la empresa activa
export const getInvitations = () => api.get("/invitations").then((res) => res.data)
export const createInvitation = ({ email, role }) => api.post("/invitations", { email, role }).then((res) => res.data)
export const revokeInvitation = (id) => api.delete(`/invitations/${id}`)

// públicas: quien abre el link todavía no tiene sesión
export const getInvitationByToken = (token) => api.get(`/invitations/token/${token}`).then((res) => res.data)
export const acceptInvitation = (token, body) =>
  api.post(`/invitations/token/${token}/accept`, body).then((res) => res.data)
