import { useOutletContext } from "react-router-dom"

export interface AppOutletContext {
  refreshKey: number
  syncing: boolean
  syncAndRefresh: () => Promise<void>
}

export function useAppOutlet() {
  return useOutletContext<AppOutletContext>()
}
