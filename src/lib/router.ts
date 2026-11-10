import { useCallback, useEffect, useState } from "react";
import { IS_PREVIEW } from "./env";

/** Tiny router: real paths in the deployed app, plain #names in the static preview build. */
export const ROUTES = {
  survey: "/",
  admin: "/admin",
  "admin-responses": "/admin/responses",
  "admin-activities": "/admin/activities",
  "admin-accommodation": "/admin/accommodation",
  "admin-insights": "/admin/insights",
  "admin-assistant": "/admin/assistant",
  "admin-settings": "/admin/settings",
} as const;
export type Route = keyof typeof ROUTES;

function current(): Route {
  if (IS_PREVIEW) {
    const name = window.location.hash.replace(/^#/, "");
    return name in ROUTES ? (name as Route) : "survey";
  }
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const hit = (Object.keys(ROUTES) as Route[]).find((r) => ROUTES[r] === path);
  return hit ?? (path.startsWith("/admin") ? "admin" : "survey");
}

export function useRoute(): [Route, (to: Route) => void] {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const sync = () => setRoute(current());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  const navigate = useCallback((to: Route) => {
    if (IS_PREVIEW) window.location.hash = to;
    else window.history.pushState(null, "", ROUTES[to]);
    setRoute(to);
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
