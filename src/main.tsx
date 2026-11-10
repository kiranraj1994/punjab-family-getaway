import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp from "./admin/AdminApp";
import "./index.css";
import { useRoute } from "./lib/router";
import SurveyApp from "./survey/SurveyApp";

function App() {
  const [route, navigate] = useRoute();
  if (route === "survey") {
    return (
      <SurveyApp
        previewLink={
          // Preview-only shortcut. The deployed survey never links to the dashboard.
          <button type="button" onClick={() => navigate("admin")} className="whitespace-nowrap rounded-full border border-gold-300/50 bg-forest-950/60 px-3.5 py-1.5 text-xs font-semibold text-gold-200 backdrop-blur hover:bg-forest-900">
            Admin preview →
          </button>
        }
      />
    );
  }
  return <AdminApp route={route} navigate={navigate} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
