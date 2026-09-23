import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

// Attach the admin JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("kiosk_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Download a protected file.
 *
 * A plain <a href> can't be used for these endpoints because they sit behind
 * `protect` + `adminOnly` and a link carries no Authorization header, so the
 * file is fetched as a blob and handed to the browser through a temporary
 * object URL instead.
 */
export const downloadFile = async (url, fallbackName = "download") => {
  const response = await api.get(url, { responseType: "blob" });

  // An error response still arrives as a blob, so unwrap it before saving.
  const contentType = response.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    const text = await response.data.text();
    throw new Error(JSON.parse(text).message || "Download failed");
  }

  // Requires `exposedHeaders: ["Content-Disposition"]` in the server's CORS
  // config, otherwise the browser hides the header and we use the fallback.
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const objectUrl = URL.createObjectURL(new Blob([response.data], { type: contentType }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return filename;
};

export default api;