/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BASE_PATH?: string
  readonly FAKE?: string
  readonly VITE_FAKE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
