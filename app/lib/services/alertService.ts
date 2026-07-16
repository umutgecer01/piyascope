import type { AlertCondition, PriceAlert } from "../types";

const STORAGE_KEY = "piyascope.alerts.v1";

function read(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as PriceAlert[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(items: PriceAlert[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

export const alertService = {
  list: read,
  add(assetSymbol: string, condition: AlertCondition, targetPrice: number) {
    const next: PriceAlert = { id: `alert-${Date.now()}`, assetSymbol, condition, targetPrice, isActive: true, createdAt: new Date().toISOString() };
    return write([next, ...read()]);
  },
  toggle(id: string) {
    return write(read().map((item) => item.id === id ? { ...item, isActive: !item.isActive } : item));
  },
  remove(id: string) {
    return write(read().filter((item) => item.id !== id));
  },
};
