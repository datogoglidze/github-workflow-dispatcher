import * as path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function normalizeBase(value: string | undefined): string {
  if (!value || value === "/") return "/"
  const withLeading = value.startsWith("/") ? value : `/${value}`
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "VITE_")
  return {
    base: normalizeBase(env.VITE_BASE_PATH),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
    server: {
      port: 3000,
    },
  }
})
