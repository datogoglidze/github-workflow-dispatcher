import {
  CalendarClock,
  FolderGit2,
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

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-2">
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
    </nav>
  )
}
