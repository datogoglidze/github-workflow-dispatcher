import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/layout/layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LogsPage } from "@/pages/logs-page"
import { PlaceholderPage } from "@/pages/placeholder-page"
import { RepositoriesPage } from "@/pages/repositories-page"
import { SchedulesPage } from "@/pages/schedules-page"
import { WorkflowsPage } from "@/pages/workflows-page"

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlaceholderPage title="Dashboard" />} />
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
