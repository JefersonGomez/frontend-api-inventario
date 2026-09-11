import {api} from './client'

export async function loginRequest(email,password){
    const response = await api.post("/auth/login", { email, password })
    return response.data
}

export async function registerRequest(name, email, password) {
  const response = await api.post("/auth/register", { name, email, password })
  return response.data
}