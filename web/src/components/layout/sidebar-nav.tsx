import {
  CalendarClock,
  FolderGit2,
  Info,
  LayoutDashboard,
  ScrollText,
  Workflow,
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/schedules", label: "Schedules", icon: CalendarClock, end: false },
  { to: "/workflows", label: "Workflows", icon: Workflow, end: false },
  { to: "/repositories", label: "Repositories", icon: FolderGit2, end: false },
  { to: "/logs", label: "Dispatch Logs", icon: ScrollText, end: false },
]

export function SidebarNav({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  return (
    <nav className={cn("flex min-h-full flex-1 flex-col justify-between p-2", className)}>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-auto border-t pt-2">
        <NavLink
          to="/about"
          end={false}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )
          }
        >
          <Info className="size-4" />
          About
        </NavLink>
      </div>
    </nav>
  )
}
