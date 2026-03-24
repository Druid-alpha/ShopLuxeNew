import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout, setUser, setToken } from "@/features/auth/authSlice";
import type { RootState } from "./store";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";

// Base query (cookies included)
const baseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Refresh-aware query
const baseQueryWithRefresh = async (args: Parameters<typeof baseQuery>[0], api: Parameters<typeof baseQuery>[1], extraOptions: Parameters<typeof baseQuery>[2]) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    const refreshResult = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions
    );

    if ("data" in refreshResult && refreshResult.data && (refreshResult.data as any).user) {
      api.dispatch(setUser((refreshResult.data as any).user));
      if ((refreshResult.data as any).accessToken) {
        api.dispatch(setToken((refreshResult.data as any).accessToken));
      }
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRefresh,
  tagTypes: ["Auth", "Product", "Cart", "Wishlist", "Order", "Review"],
  endpoints: () => ({}),
});

