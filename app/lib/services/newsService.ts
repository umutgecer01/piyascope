import type { ImpactLevel, NewsArticle, ServiceResult, SiteLocale } from "../types";

type ApiNewsItem = {
  id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  sourceType: "Birincil" | "Haber";
  confidence: "A1" | "B1";
  sourceDomain?: string;
};

export type NewsStats = {
  directorySources: number;
  feedCount: number;
  activeFeeds: number;
  failedFeeds: number;
  directFeeds: number;
  primaryCount: number;
  mediaCount: number;
  latestAt: string;
  latencyMs: number;
};

type ApiResponse = {
  news?: ApiNewsItem[];
  mode?: "live" | "unavailable";
  updatedAt?: string;
  stats?: NewsStats;
  error?: string;
};

export type NewsServiceResult = ServiceResult<NewsArticle[]> & {
  mode?: ApiResponse["mode"];
  stats?: NewsStats;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function inferCategory(item: ApiNewsItem, locale: SiteLocale) {
  if (locale === "en") return item.category;
  const text = `${item.title} ${item.category}`.toLocaleLowerCase("tr-TR");
  if (/bitcoin|ethereum|kripto|blockchain/.test(text)) return "Kripto";
  if (/altın|gold|ons/.test(text)) return "Altın";
  if (/petrol|enerji|doğal gaz/.test(text)) return "Enerji";
  if (/dolar|euro|döviz|kur\b/.test(text)) return "Döviz";
  if (/kap|şirket|bilanço|temettü/.test(text)) return "Şirket Haberleri";
  if (/teknoloji|yapay zeka|yapay zekâ/.test(text)) return "Teknoloji";
  if (/fed|ecb|küresel|abd|avrupa|global/.test(text)) return "Dünya Ekonomisi";
  if (item.category === "Piyasalar") return "Borsa";
  if (item.category === "Türkiye") return "Türkiye Ekonomisi";
  return item.category;
}

function inferAssets(title: string) {
  const text = title.toLocaleUpperCase("tr-TR");
  const symbols = ["THYAO", "ASELS", "TUPRS", "XU100", "BTC", "ETH", "USDTRY", "EURTRY", "GAUTRY", "XAUUSD"];
  const found = symbols.filter((symbol) => text.includes(symbol) || (symbol === "BTC" && text.includes("BITCOIN")) || (symbol === "ETH" && text.includes("ETHEREUM")) || (symbol === "USDTRY" && /DOLAR|USD/.test(text)) || (symbol === "EURTRY" && /EURO|EUR/.test(text)) || (symbol === "GAUTRY" && /GRAM ALTIN/.test(text)) || (symbol === "XAUUSD" && /ONS|GOLD/.test(text)) || (symbol === "XU100" && /BORSA|BIST/.test(text)));
  return found.slice(0, 4);
}

function inferImpact(title: string): ImpactLevel {
  const text = title.toLocaleLowerCase("tr-TR");
  if (/faiz|enflasyon|karar|kriz|tarım dışı|bilanço|istihdam/.test(text)) return "high";
  if (/piyasa|döviz|şirket|yatırım|banka|altın/.test(text)) return "medium";
  return "low";
}

function normalize(item: ApiNewsItem, locale: SiteLocale): NewsArticle {
  const title = item.title.replace(/\s+-\s+[^-]+$/, "").trim();
  const category = inferCategory(item, locale);
  const summary = item.summary?.trim() || title;
  return {
    id: item.id,
    slug: `${slugify(title)}-${slugify(item.id).slice(-12)}`,
    title,
    summary,
    content: summary,
    category,
    source: item.source,
    sourceUrl: item.url,
    sourceDomain: item.sourceDomain,
    imageUrl: "",
    publishedAt: item.publishedAt,
    updatedAt: item.publishedAt,
    impactLevel: inferImpact(title),
    relatedAssets: inferAssets(`${title} ${summary}`),
    readingTime: Math.max(1, Math.min(7, Math.ceil(summary.split(/\s+/).length / 180))),
    sourceType: item.sourceType === "Birincil" ? "primary" : "news",
    confidence: item.confidence,
    viewScore: 0,
  };
}

export const newsService = {
  async getNews(locale: SiteLocale = "tr", options: { refresh?: boolean } = {}): Promise<NewsServiceResult> {
    try {
      const params = new URLSearchParams({ lang: locale });
      if (options.refresh) params.set("refresh", "1");
      const response = await fetch(`/api/news?${params.toString()}`);
      const payload = await response.json() as ApiResponse;
      if (!response.ok || payload.mode !== "live") throw new Error(payload.error || `Haber servisi ${response.status} yanıtı verdi.`);
      return { data: (payload.news ?? []).map((item) => normalize(item, locale)), updatedAt: payload.updatedAt ?? new Date().toISOString(), mode: payload.mode, stats: payload.stats };
    } catch (error) {
      return { data: [], updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Canlı haber akışı alınamadı." };
    }
  },

  async getBySlug(slug: string, locale: SiteLocale = "tr"): Promise<ServiceResult<NewsArticle | null>> {
    const result = await this.getNews(locale);
    const article = result.data.find((item) => item.slug === slug || item.id === slug) ?? null;
    return { ...result, data: article };
  },
};
