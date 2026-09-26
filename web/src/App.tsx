import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/layout/layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardPage } from "@/pages/dashboard-page"
import { LogsPage } from "@/pages/logs-page"
import { RepositoriesPage } from "@/pages/repositories-page"
import { SchedulesPage } from "@/pages/schedules-page"
import { WorkflowsPage } from "@/pages/workflows-page"

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="schedules" element={<SchedulesPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="repositories" element={<RepositoriesPage />} />
            <Route path="logs" element={<LogsPage />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
