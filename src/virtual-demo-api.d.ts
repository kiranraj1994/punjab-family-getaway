/** Resolved by the "virtual:demo-api" alias in vite.config.ts (demoApi.ts or a no-content stub). */
declare module "virtual:demo-api" {
  import type { AdminApi } from "./admin/api";
  export const demoApi: AdminApi;
}
