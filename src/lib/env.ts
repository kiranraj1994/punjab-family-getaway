/** True only in the static design-review build (vite build --mode preview): no backend, demo data. */
export const IS_PREVIEW = import.meta.env.MODE === "preview";
