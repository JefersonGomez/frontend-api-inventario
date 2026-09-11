import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

// 1. Corregido el nombre: ProtectedRoute (con 't')
export function ProtectedRoute({ children }) {
    // 2. Corregida la llamada al hook: useAuth() con paréntesis
    const { token } = useAuth() 

    if (!token) {
        return <Navigate to="/login" replace />
    }

    return children
}