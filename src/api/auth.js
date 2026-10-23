import {api} from './client'

export async function loginRequest(email,password){
    const response = await api.post("/auth/login", { email, password })
    return response.data
}

export async function registerRequest({ name, email, password, phone, company, acceptTerms }) {
  const response = await api.post("/auth/register", { name, email, password, phone, company, acceptTerms })
  return response.data
}

// usuario de la sesión con sus permisos efectivos en la empresa activa y si tiene PIN
export const getMe = () => api.get("/auth/me").then((res) => res.data.user)

// Demo pública: si está activa (y los códigos de caja que se muestran) y entrar sin contraseña
export const getDemoInfo = () => api.get("/auth/demo").then((res) => res.data)
export const demoLogin = (role) => api.post("/auth/demo", { role }).then((res) => res.data)
