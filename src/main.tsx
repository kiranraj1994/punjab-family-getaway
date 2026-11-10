import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./admin/AdminApp";
import { liveApi, type AdminApi } from "./admin/api";
import "./index.css";
import { IS_PREVIEW } from "./lib/env";
import { useRoute } from "./lib/router";
import SurveyApp from "./survey/SurveyApp";

/**
 * demoApi (and its demo.ts rows) is loaded only via this dynamic import, which only executes
 * when IS_PREVIEW is true. Unlike a static import, this keeps the demo module in its own chunk
 * that a production build never fetches, so no demo data reaches the real bundle — a plain
 * `IS_PREVIEW ? demoApi : liveApi` ternary with both branches statically imported still shipped
 * the demo rows inside the main bundle even though they were unreachable at runtime.
 */
async function loadAdminApi(): Promise<AdminApi> {
  if (!IS_PREVIEW) return liveApi;
  // Resolved by the "virtual:demo-api" alias in vite.config.ts: demoApi.ts only in the
  // preview build, a no-demo-content stub everywhere else.
  const { demoApi } = await import("virtual:demo-api");
  return demoApi;
}

function App({ adminApi }: { adminApi: AdminApi }) {
  const [route, navigate] = useRoute();
  if (route === "survey") {
    return (
      <SurveyApp
        previewLink={
          // Design-preview shortcut only. The deployed survey never links to the dashboard.
          IS_PREVIEW ? (
            <button type="button" onClick={() => navigate("admin")} className="whitespace-nowrap rounded-full border border-gold-300/50 bg-forest-950/60 px-3.5 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur hover:bg-forest-900">
              Admin preview →
            </button>
          ) : undefined
        }
      />
    );
  }
  return <AdminApp api={adminApi} route={route} navigate={navigate} />;
}

const root = createRoot(document.getElementById("root")!);
loadAdminApi().then((adminApi) => {
  root.render(
    <StrictMode>
      <App adminApi={adminApi} />
    </StrictMode>,
  );
});
