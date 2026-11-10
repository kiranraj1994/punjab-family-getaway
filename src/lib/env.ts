/** True in the static design-review build (vite --mode preview): no backend, demo data only. */
export const IS_PREVIEW = import.meta.env.MODE === "preview" || import.meta.env.VITE_DEMO === "1";
