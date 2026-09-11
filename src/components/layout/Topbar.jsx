import { Search, Bell, Menu, LogOut } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-muted-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center bg-white/5 rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="bg-transparent outline-none text-sm placeholder-muted-foreground w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground">
          <Bell className="w-4 h-4" />
        </button>

     <DropdownMenu>
  <DropdownMenuTrigger
    render={<Button variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0" />}
  >
    <Avatar>
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
        {initials || "US"}
      </AvatarFallback>
    </Avatar>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuGroup>
      <DropdownMenuLabel>
        <p className="font-medium">{user?.name}</p>
        <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
      </DropdownMenuLabel>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar sesión
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
      </div>
    </header>
  )
}