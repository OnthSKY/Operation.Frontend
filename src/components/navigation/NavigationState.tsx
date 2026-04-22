"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type NavigationStateValue = {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
};

const NavigationStateContext = createContext<NavigationStateValue | null>(null);

export function NavigationStateProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const value = useMemo<NavigationStateValue>(
    () => ({
      isSidebarOpen,
      openSidebar: () => setSidebarOpen(true),
      closeSidebar: () => setSidebarOpen(false),
    }),
    [isSidebarOpen]
  );
  return <NavigationStateContext.Provider value={value}>{children}</NavigationStateContext.Provider>;
}

export function useNavigationState() {
  const ctx = useContext(NavigationStateContext);
  if (!ctx) throw new Error("useNavigationState must be used within NavigationStateProvider");
  return ctx;
}
