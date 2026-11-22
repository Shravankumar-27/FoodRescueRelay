const configuredApi = import.meta.env.VITE_API_BASE_URL;
export const API_BASE: string = import.meta.env.DEV && /^http:\/\/(localhost|127\.0\.0\.1):8000\/api\/v1\/?$/.test(configuredApi ?? "")
  ? "/api/v1"
  : configuredApi?.replace(/\/$/, "") || "/api/v1";
