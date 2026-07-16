import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://finans-akis.umutgecer02.chatgpt.site";
  const routes = ["", "/haberler", "/piyasalar", "/ekonomik-takvim", "/ai-analist", "/ozet/sabah", "/ozet/gun-sonu", "/takip-listem", "/alarmlar", "/kaynaklar", "/hakkimizda", "/en", "/en/agenda", "/en/markets", "/en/news-radar", "/en/sources"];
  return routes.map((route) => ({ url: `${base}${route}`, lastModified: new Date("2026-07-15T00:00:00Z"), changeFrequency: route === "" || route.includes("news") || route === "/haberler" ? "hourly" : "daily", priority: route === "" ? 1 : route.startsWith("/en") ? 0.7 : 0.8 }));
}
