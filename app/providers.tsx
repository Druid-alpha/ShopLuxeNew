"use client"

import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import GlobalToast from "@/components/ToastProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <GlobalToast>{children}</GlobalToast>
    </Provider>
  );
}

