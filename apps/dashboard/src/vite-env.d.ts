/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Must match DASHBOARD_API_KEY in apps/api/.env */
  readonly VITE_DASHBOARD_API_KEY: string;
  /** Store context sent with every API request */
  readonly VITE_DEFAULT_STORE_ID: string;
  /** API base URL — empty in dev (uses Vite proxy) */
  readonly VITE_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
