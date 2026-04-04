import axios from "axios";
import type { AxiosRequestHeaders } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const baseURL = config.baseURL || "";
    let url = config.url || "";
    if (url && !url.startsWith("http") && !url.startsWith("//")) {
      if (url.startsWith("/")) {
        if (baseURL.endsWith("/api") && url.startsWith("/api")) {
          url = url.replace(/^\/api\/?/, "");
        } else {
          url = url.replace(/^\/+/, "");
        }
        config.url = url;
      }
    }
  } catch {
    // Ignore URL normalization errors
  }
  try {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
  } catch {
    // Ignore token read errors (e.g. SSR or private mode restrictions)
  }
  return config;
});

export default api;

