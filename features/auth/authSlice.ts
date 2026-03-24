import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/store/api";
import type { User } from "@/types/models";

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem("user");
    if (!stored || stored === "undefined") return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem("accessToken") || null;
  } catch {
    return null;
  }
}

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: getStoredUser(), // MUST be the user object, not { user: {...} }
  token: getStoredToken(),
  loading: false,
  error: null,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    setToken: (state, action: PayloadAction<string | null>) => {
      state.token = action.payload;
      if (action.payload) {
        localStorage.setItem("accessToken", action.payload);
      } else {
        localStorage.removeItem("accessToken");
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
    },
  },
});

export const { setUser, setToken, logout } = authSlice.actions;

export const logoutAndReset = () => (dispatch: (action: unknown) => void) => {
  dispatch(logout());
  dispatch(api.util.resetApiState());
};

export default authSlice.reducer;


