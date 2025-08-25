export const appName = import.meta.env.VITE_APP_NAME || "CrediSphere";

// Get the current hostname (for production) or use environment variable
const getBackendUrl = () => {
  // Use explicit environment variable in any mode (dev/prod)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // In production build without explicit env, derive from current hostname
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    // If deployed to IP address or domain, use that
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}`;
    }
  }

  // Default for development: use relative base so Vite proxy handles /api
  return "";
};

export const backendUrl = getBackendUrl();
export const allowRegistration =
  import.meta.env.VITE_ALLOW_REGISTRATION === "true";
