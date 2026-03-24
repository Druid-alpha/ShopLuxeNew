export const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "/api";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
};

export const apiUrl = (path: string) => {
  const base = getApiBaseUrl();
  if (!path) return base;
  if (path.startsWith("http")) return path;
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
};
