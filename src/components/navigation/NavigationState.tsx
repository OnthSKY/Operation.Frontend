"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type NavigationStateValue = {
  isSidebarOpen: boolean;
  isMobileFullMenuOpen: boolean;
  openMobileFullMenu: () => void;
  closeMobileFullMenu: () => void;
  /** Soldan dar menü (gruplu liste); tam ekran menüyü kapatır */
  openSidebar: () => void;
  closeSidebar: () => void;
};

const NavigationStateContext = createContext<NavigationStateValue | null>(null);

export function NavigationStateProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileFullMenuOpen, setMobileFullMenuOpen] = useState(false);
  const value = useMemo<NavigationStateValue>(
    () => ({
      isSidebarOpen,
      isMobileFullMenuOpen,
      openMobileFullMenu: () => {
        setSidebarOpen(false);
        setMobileFullMenuOpen(true);
      },
      closeMobileFullMenu: () => setMobileFullMenuOpen(false),
      openSidebar: () => {
        setMobileFullMenuOpen(false);
        setSidebarOpen(true);
      },
      closeSidebar: () => setSidebarOpen(false),
    }),
    [isSidebarOpen, isMobileFullMenuOpen]
  );
  return <NavigationStateContext.Provider value={value}>{children}</NavigationStateContext.Provider>;
}

export function useNavigationState() {
  const ctx = useContext(NavigationStateContext);
  if (!ctx) throw new Error("useNavigationState must be used within NavigationStateProvider");
  return ctx;
}
