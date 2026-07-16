import type { MarketAsset, PricePoint, ServiceResult, TimeRange } from "../types";

type SnapshotPayload = { assets?: MarketAsset[]; asset?: MarketAsset | null; total?: number; updatedAt?: string; errors?: string[]; error?: string };
type HistoryPayload = { points?: PricePoint[]; updatedAt?: string; sourceName?: string; sourceUrl?: string; seriesType?: "historical" | "reference-series" | "performance-points"; chartType?: "ohlc" | "derived-ohlc"; error?: string };
type MarketSnapshotResult = ServiceResult<MarketAsset[]> & { total?: number };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Piyasa servisi ${response.status} yanıtı verdi.`);
  return payload;
}

function marketParams(options: { query?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set("query", options.query.trim());
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));
  return params.toString();
}

export const marketService = {
  async getSnapshot(options: { query?: string; limit?: number; offset?: number } = {}): Promise<MarketSnapshotResult> {
    try {
      const query = marketParams(options);
      const payload = await readJson<SnapshotPayload>(await fetch(`/api/markets${query ? `?${query}` : ""}`));
      return {
        data: payload.assets ?? [],
        total: payload.total,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        ...(payload.errors?.length ? { error: payload.errors.join(" · ") } : {}),
      };
    } catch (error) {
      return { data: [], updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Güncel piyasa verisi alınamadı." };
    }
  },

  async getAsset(symbol: string): Promise<ServiceResult<MarketAsset | null>> {
    try {
      const payload = await readJson<SnapshotPayload>(await fetch(`/api/markets?symbol=${encodeURIComponent(symbol.toUpperCase())}`));
      return {
        data: payload.asset ?? null,
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        ...(payload.errors?.length ? { error: payload.errors.join(" · ") } : {}),
      };
    } catch (error) {
      return { data: null, updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Varlık verisi alınamadı." };
    }
  },

  async getHistory(symbol: string, range: TimeRange = "1A"): Promise<ServiceResult<PricePoint[]>> {
    try {
      const payload = await readJson<HistoryPayload>(await fetch(`/api/markets?symbol=${encodeURIComponent(symbol.toUpperCase())}&range=${encodeURIComponent(range)}`));
      return {
        data: payload.points ?? [],
        updatedAt: payload.updatedAt ?? new Date().toISOString(),
        ...(payload.sourceName ? { sourceName: payload.sourceName } : {}),
        ...(payload.sourceUrl ? { sourceUrl: payload.sourceUrl } : {}),
        ...(payload.seriesType ? { seriesType: payload.seriesType } : {}),
        ...(payload.chartType ? { chartType: payload.chartType } : {}),
        ...(payload.error ? { error: payload.error } : {}),
      };
    } catch (error) {
      return { data: [], updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Gerçek grafik verisi alınamadı." };
    }
  },
};
