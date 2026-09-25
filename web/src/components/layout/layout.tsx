import { GitFork, Menu } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Outlet } from "react-router-dom"
import { toast } from "sonner"
import { syncRepositories } from "@/api/repositories"
import { ModeToggle } from "@/components/mode-toggle"
import { SyncReposButton } from "@/components/sync-repos-button"
import { HealthIndicator } from "@/components/layout/health-indicator"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { TimezoneBadge } from "@/components/layout/timezone-badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { AppOutletContext } from "@/hooks/use-app-outlet"

export function Layout() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const syncingRef = useRef(false)

  const syncAndRefresh = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const result = await syncRepositories()
      toast.success(
        `Synced ${result.repositories_synced} repositories, ${result.workflows_synced} workflows, ${result.workflows_marked_deleted} marked deleted`,
      )
      setRefreshKey((key) => key + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed")
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [])

  const outletContext: AppOutletContext = {
    refreshKey,
    syncing,
    syncAndRefresh,
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setNavOpen(true)}
        >
          <Menu />
        </Button>
        <GitFork className="size-4 shrink-0" />
        <span className="truncate text-sm font-semibold">Workflow Dispatcher</span>
        <div className="ml-auto flex items-center gap-2">
          <SyncReposButton label="Sync Repos" syncing={syncing} onSync={syncAndRefresh} />
          <TimezoneBadge />
          <HealthIndicator />
          <ModeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r md:block">
          <SidebarNav />
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <Outlet context={outletContext} />
        </main>
      </div>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-60">
          <SheetHeader>
            <SheetTitle>Workflow Dispatcher</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
