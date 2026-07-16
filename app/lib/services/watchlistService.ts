import type { WatchlistItem } from "../types";

const STORAGE_KEY = "piyascope.watchlist.v1";

function read(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as WatchlistItem[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(items: WatchlistItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("piyascope:watchlist"));
  return items;
}

export const watchlistService = {
  list: read,
  addAsset(symbol: string) {
    const items = read();
    if (items.some((item) => item.assetSymbol === symbol)) return items;
    return write([...items, { id: `asset-${symbol}`, assetSymbol: symbol, addedAt: new Date().toISOString(), order: items.length }]);
  },
  addCategory(category: string) {
    const items = read();
    if (items.some((item) => item.category === category)) return items;
    return write([...items, { id: `category-${category}`, category, addedAt: new Date().toISOString(), order: items.length }]);
  },
  remove(id: string) {
    return write(read().filter((item) => item.id !== id).map((item, order) => ({ ...item, order })));
  },
  replace(items: WatchlistItem[]) {
    return write(items.map((item, order) => ({ ...item, order })));
  },
  hasAsset(symbol: string) {
    return read().some((item) => item.assetSymbol === symbol);
  },
};
