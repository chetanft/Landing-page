/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FT_TMS_API_BASE_URL?: string
  readonly VITE_FT_TMS_UNIQUE_ID?: string
  readonly VITE_FT_TMS_APP_ID?: string
  readonly VITE_FT_TMS_BRANCH_FTEID?: string
  readonly VITE_FT_TMS_AUTH_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
