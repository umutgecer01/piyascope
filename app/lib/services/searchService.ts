import { marketCatalog } from "../data/catalog";
import type { NewsArticle, SearchResult, SiteLocale } from "../types";

const categories = ["Borsa", "Döviz", "Altın", "Kripto", "Türkiye Ekonomisi", "Dünya Ekonomisi", "Şirket Haberleri", "Teknoloji", "Enerji"];

const pages: SearchResult[] = [
  { id: "page-news", title: "Haberler", subtitle: "Canlı ekonomi ve finans akışı", type: "page", href: "/haberler" },
  { id: "page-market", title: "Piyasalar", subtitle: "Varlıklar ve piyasa özeti", type: "page", href: "/piyasalar" },
  { id: "page-calendar", title: "Ekonomik Takvim", subtitle: "Yaklaşan önemli veriler", type: "page", href: "/ekonomik-takvim" },
  { id: "page-ai", title: "AI Analist", subtitle: "Güncel kaynaklardan otomatik piyasa analizi", type: "page", href: "/ai-analist" },
];

export const searchService = {
  search(query: string, news: NewsArticle[] = [], locale: SiteLocale = "tr"): SearchResult[] {
    const normalized = query.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US").trim();
    if (!normalized) return [];
    const assets: SearchResult[] = marketCatalog.map((asset) => ({
      id: `asset-${asset.symbol}`,
      title: asset.symbol,
      subtitle: asset.name,
      type: "asset",
      href: `/varlik/${asset.symbol}`,
      symbol: asset.symbol,
    }));
    const categoryResults: SearchResult[] = categories.map((category) => ({
      id: `category-${category}`,
      title: category,
      subtitle: "Haber kategorisi",
      type: "category",
      href: `/haberler?kategori=${encodeURIComponent(category)}`,
    }));
    const newsResults: SearchResult[] = news.map((article) => ({
      id: `news-${article.id}`,
      title: article.title,
      subtitle: `${article.source} · ${article.category}`,
      type: "news",
      href: `/haber/${article.slug}`,
    }));
    return [...assets, ...newsResults, ...categoryResults, ...pages]
      .filter((item) => `${item.title} ${item.subtitle} ${item.symbol ?? ""}`.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US").includes(normalized))
      .slice(0, 9);
  },

  getRecent(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const value = JSON.parse(localStorage.getItem("piyascope.recent-searches.v1") ?? "[]") as string[];
      return Array.isArray(value) ? value.slice(0, 5) : [];
    } catch {
      return [];
    }
  },

  saveRecent(query: string) {
    if (typeof window === "undefined" || !query.trim()) return;
    const next = [query.trim(), ...this.getRecent().filter((item) => item !== query.trim())].slice(0, 5);
    localStorage.setItem("piyascope.recent-searches.v1", JSON.stringify(next));
  },
};
