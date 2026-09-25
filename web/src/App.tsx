import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/layout/layout"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PlaceholderPage } from "@/pages/placeholder-page"
import { RepositoriesPage } from "@/pages/repositories-page"
import { WorkflowsPage } from "@/pages/workflows-page"

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<PlaceholderPage title="Dashboard" />} />
            <Route path="schedules" element={<PlaceholderPage title="Schedules" />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="repositories" element={<RepositoriesPage />} />
            <Route path="logs" element={<PlaceholderPage title="Dispatch Logs" />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
