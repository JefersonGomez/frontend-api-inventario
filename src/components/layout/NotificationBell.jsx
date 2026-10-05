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
          <button className="stk-icon-btn" aria-label={`Notificaciones (${notifications.length})`}>
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.7} aria-hidden />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-destructive text-white text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
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
