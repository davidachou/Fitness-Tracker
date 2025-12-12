"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const ADMIN_UI_MODE_KEY = "admin-ui-mode";

interface AdminUIModeContextType {
  adminUIMode: boolean;
  toggleAdminUIMode: () => void;
}

const AdminUIModeContext = createContext<AdminUIModeContextType | null>(null);

interface AdminUIModeProviderProps {
  children: ReactNode;
}

export function AdminUIModeProvider({ children }: AdminUIModeProviderProps) {
  const [adminUIMode, setAdminUIMode] = useState(true); // Default to admin mode for admins

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const stored = localStorage.getItem(ADMIN_UI_MODE_KEY);
      if (stored !== null) {
        setAdminUIMode(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleAdminUIMode = () => {
    const newMode = !adminUIMode;
    setAdminUIMode(newMode);

    // Save to localStorage
    try {
      localStorage.setItem(ADMIN_UI_MODE_KEY, JSON.stringify(newMode));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <AdminUIModeContext.Provider value={{ adminUIMode, toggleAdminUIMode }}>
      {children}
    </AdminUIModeContext.Provider>
  );
}

export function useAdminUIMode() {
  const context = useContext(AdminUIModeContext);
  if (!context) {
    throw new Error("useAdminUIMode must be used within an AdminUIModeProvider");
  }
  return context;
}
