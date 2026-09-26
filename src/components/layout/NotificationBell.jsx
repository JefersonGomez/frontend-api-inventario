// src/components/layout/NotificationBell.jsx
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hoocks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const { data } = useNotifications();
  const notifications = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="relative w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground">
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        </DropdownMenuGroup>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-3">
            Sin notificaciones nuevas
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={
                <Link to={n.link} className="text-sm whitespace-normal py-2">
                  {n.message}
                </Link>
              }
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
