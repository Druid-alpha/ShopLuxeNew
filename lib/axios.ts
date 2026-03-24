import axios from "axios";
import type { AxiosRequestHeaders } from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
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

