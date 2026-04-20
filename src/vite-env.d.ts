/// <reference types="vite/client" />

// Fallback ambient declarations in case `vite/client` types are unavailable
// (e.g. node_modules not installed in the typecheck sandbox).

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.png" { const src: string; export default src; }
declare module "*.jpg" { const src: string; export default src; }
declare module "*.jpeg" { const src: string; export default src; }
declare module "*.gif" { const src: string; export default src; }
declare module "*.svg" { const src: string; export default src; }
declare module "*.webp" { const src: string; export default src; }
declare module "*.avif" { const src: string; export default src; }
declare module "*.mp4" { const src: string; export default src; }
declare module "*.webm" { const src: string; export default src; }
declare module "*.mp3" { const src: string; export default src; }
declare module "*.wav" { const src: string; export default src; }

declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.less";
