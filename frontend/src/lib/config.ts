const configuredApi = import.meta.env.VITE_API_BASE_URL;
const apiOrigin = configuredApi?.replace(/\/$/, "");
export const API_BASE: string = import.meta.env.DEV && /^http:\/\/(localhost|127\.0\.0\.1):8000(?:\/api\/v1)?$/.test(apiOrigin ?? "")
  ? "/api/v1"
  : apiOrigin ? (apiOrigin.endsWith("/api/v1") ? apiOrigin : `${apiOrigin}/api/v1`) : "/api/v1";
