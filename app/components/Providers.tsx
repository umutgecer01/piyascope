"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
type Toast = { id: number; message: string; tone: "success" | "info" | "error" };

const ThemeContext = createContext<{ theme: Theme; toggleTheme(): void } | null>(null);
const ToastContext = createContext<{ push(message: string, tone?: Toast["tone"]): void } | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("piyascope.theme") as Theme | null;
    const preferred = saved ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    queueMicrotask(() => setTheme(preferred));
    document.documentElement.dataset.theme = preferred;
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("piyascope.theme", next);
      return next;
    });
  }, []);

  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  const toastValue = useMemo(() => ({ push }), [push]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <div className="toast-viewport" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => <div className={`toast toast-${toast.tone}`} role="status" key={toast.id}>{toast.message}</div>)}
        </div>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme AppProviders içinde kullanılmalıdır.");
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast AppProviders içinde kullanılmalıdır.");
  return value;
}
