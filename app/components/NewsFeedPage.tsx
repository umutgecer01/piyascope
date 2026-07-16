"use client";

import { Clock3, Radio, RefreshCw, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { newsService, type NewsStats } from "../lib/services/newsService";
import type { NewsArticle, SiteLocale } from "../lib/types";
import { useToast } from "./Providers";
import { NewsCard } from "./ui/cards";
import { Badge, Button, EmptyState, ErrorState, PageContainer, SearchBox, SectionHeader, Skeleton } from "./ui/primitives";

const categoriesTr = ["Tümü", "Borsa", "Döviz", "Altın", "Kripto", "Türkiye Ekonomisi", "Dünya Ekonomisi", "Şirket Haberleri", "Teknoloji", "Enerji"];
const categoriesEn = ["All", "Global", "Markets", "Companies", "Technology"];

function formatClock(value?: string, locale: SiteLocale = "tr") {
  if (!value) return locale === "en" ? "Waiting" : "Bekleniyor";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function impactLabel(value: NewsArticle["impactLevel"], locale: SiteLocale) {
  if (locale === "en") return value === "high" ? "High" : value === "medium" ? "Medium" : "Low";
  return value === "high" ? "Yüksek" : value === "medium" ? "Orta" : "Düşük";
}

export default function NewsFeedPage({ locale = "tr" }: { locale?: SiteLocale }) {
  const allLabel = locale === "en" ? "All" : "Tümü";
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(() => {
    if (typeof window === "undefined") return allLabel;
    return new URLSearchParams(location.search).get("kategori") ?? allLabel;
  });
  const [source, setSource] = useState(allLabel);
  const [date, setDate] = useState("all");
  const [asset, setAsset] = useState(allLabel);
  const [impact, setImpact] = useState("all");
  const [sort, setSort] = useState("newest");
  const [saved, setSaved] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("piyascope.saved-news.v1") ?? "[]") as string[]; } catch { return []; }
  });
  const [now, setNow] = useState(() => Date.now());
  const { push } = useToast();

  const load = useCallback((refresh = false, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    void newsService.getNews(locale, { refresh }).then((result) => {
      setNews(result.data);
      setStats(result.stats ?? null);
      setUpdatedAt(result.updatedAt);
      setError(result.error ?? "");
      setNow(Date.now());
    }).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Canlı haber akışı alınamadı.");
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [locale]);

  useEffect(() => { queueMicrotask(() => load(false)); }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => load(false, true), 60_000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") load(false, true);
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [load]);

  const sources = useMemo(() => [allLabel, ...new Set(news.map((item) => item.source))], [allLabel, news]);
  const assets = useMemo(() => [allLabel, ...new Set(news.flatMap((item) => item.relatedAssets))], [allLabel, news]);
  const visible = useMemo(() => {
    const normalized = query.toLocaleLowerCase("tr-TR").trim();
    const result = news.filter((item) => {
      const matchesCategory = category === allLabel || item.category === category;
      const matchesSource = source === allLabel || item.source === source;
      const matchesAsset = asset === allLabel || item.relatedAssets.includes(asset);
      const matchesImpact = impact === "all" || item.impactLevel === impact;
      const ageHours = (now - Date.parse(item.publishedAt)) / 3_600_000;
      const matchesDate = date === "all" || (date === "today" && ageHours <= 24) || (date === "week" && ageHours <= 168);
      const matchesText = !normalized || `${item.title} ${item.summary} ${item.source} ${item.sourceDomain ?? ""} ${item.category}`.toLocaleLowerCase("tr-TR").includes(normalized);
      return matchesCategory && matchesSource && matchesAsset && matchesImpact && matchesDate && matchesText;
    });
    return result.sort((a, b) => sort === "source"
      ? ((b.sourceType === "primary" ? 1 : 0) - (a.sourceType === "primary" ? 1 : 0)) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
      : sort === "impact"
        ? ({ high: 3, medium: 2, low: 1 }[b.impactLevel] - { high: 3, medium: 2, low: 1 }[a.impactLevel])
        : Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }, [allLabel, news, query, category, source, asset, impact, date, sort, now]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("piyascope.saved-news.v1", JSON.stringify(next));
      push(next.includes(id) ? "Haber kaydedildi." : "Haber kayıtlardan çıkarıldı.", "success");
      return next;
    });
  };

  const share = async (article: NewsArticle) => {
    const url = `${location.origin}/haber/${article.slug}`;
    if (navigator.share) await navigator.share({ title: article.title, url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); push("Bağlantı kopyalandı.", "success"); }
  };

  const resetFilters = () => {
    setQuery("");
    setCategory(allLabel);
    setSource(allLabel);
    setDate("all");
    setAsset(allLabel);
    setImpact("all");
  };

  const categories = locale === "en" ? categoriesEn : categoriesTr;
  const copy = locale === "en" ? {
    eyebrow: "LIVE NEWS FLOW",
    title: "Signal over noise.",
    description: "Filter finance news by source, asset and impact.",
    sectionEyebrow: "LIVE DESK",
    sectionDescription: "Direct RSS feeds and official sources are refreshed quickly, deduplicated and ranked by recency and reliability.",
    live: "Live",
    refresh: "Refresh",
    refreshing: "Refreshing",
    activeFeeds: "active feeds",
    directFeeds: "direct feeds",
    latest: "Latest item",
    latency: "Fetch time",
    search: "Search title, source or asset...",
    source: "Source",
    date: "Date",
    asset: "Related asset",
    impact: "Impact",
    sort: "Sort",
    newest: "Newest",
    sourceFirst: "Primary source first",
    impactFirst: "Highest impact",
    clear: "Clear filters",
    noFilter: "No news found with these filters",
    noFilterDesc: "Remove a filter or try another search term.",
  } : {
    eyebrow: "CANLI HABER AKIŞI",
    title: "Gürültü değil, sinyal.",
    description: "Finans haberlerini kaynak, tarih, ilgili varlık ve olası etki seviyesine göre filtrele.",
    sectionEyebrow: "CANLI MASA",
    sectionDescription: "Doğrudan RSS ve resmî kaynaklar hızlı çekilir, tekrarlar ayıklanır ve güncellik/güvenilirlik sırasına göre dizilir.",
    live: "Canlı",
    refresh: "Yenile",
    refreshing: "Yenileniyor",
    activeFeeds: "aktif kaynak",
    directFeeds: "doğrudan akış",
    latest: "En yeni kayıt",
    latency: "Çekme süresi",
    search: "Başlık, kaynak veya varlık ara...",
    source: "Kaynak",
    date: "Tarih",
    asset: "İlgili varlık",
    impact: "Etki seviyesi",
    sort: "Sırala",
    newest: "En yeni",
    sourceFirst: "Birincil kaynak önce",
    impactFirst: "Etkisi en yüksek",
    clear: "Filtreleri temizle",
    noFilter: "Bu filtrelerle haber bulunamadı",
    noFilterDesc: "Filtrelerden birini kaldır veya farklı bir arama metni dene.",
  };

  return <>
    <section className="page-title-band"><PageContainer className="title-row"><div><span className="eyebrow-label">{copy.eyebrow}</span><h1>{copy.title}</h1></div><p>{copy.description}</p></PageContainer></section>
    <section className="content-section"><PageContainer>
      <SectionHeader
        eyebrow={copy.sectionEyebrow}
        title={`${visible.length} ${locale === "en" ? "developments" : "gelişme"}`}
        description={copy.sectionDescription}
        action={<div className="live-feed-actions"><Badge tone={error && news.length ? "warning" : "positive"}>{copy.live}</Badge><Button variant="secondary" size="sm" onClick={() => load(true, true)} disabled={refreshing}><RefreshCw className={`inline-icon ${refreshing ? "spin" : ""}`} aria-hidden="true" />{refreshing ? copy.refreshing : copy.refresh}</Button></div>}
      />
      <div className="live-feed-panel" aria-label={locale === "en" ? "Live feed status" : "Canlı akış durumu"}>
        <div><Radio className="inline-icon" aria-hidden="true" /><span>{copy.activeFeeds}</span><strong>{stats ? `${stats.activeFeeds}/${stats.feedCount}` : "-"}</strong></div>
        <div><Zap className="inline-icon" aria-hidden="true" /><span>{copy.directFeeds}</span><strong>{stats?.directFeeds ?? "-"}</strong></div>
        <div><Clock3 className="inline-icon" aria-hidden="true" /><span>{copy.latest}</span><strong>{formatClock(stats?.latestAt, locale)}</strong></div>
        <div><RefreshCw className="inline-icon" aria-hidden="true" /><span>{copy.latency}</span><strong>{stats ? `${stats.latencyMs} ms` : "-"}</strong></div>
      </div>
      <div className="feed-timestamp">{locale === "en" ? "Last refresh" : "Son yenileme"}: {formatClock(updatedAt, locale)}</div>
      <div className="filter-panel news-filters"><SearchBox value={query} onChange={setQuery} placeholder={copy.search} label={locale === "en" ? "Search news" : "Haberlerde ara"} /><div className="category-scroll" aria-label="Haber kategorileri">{categories.map((item) => <button type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="filter-grid">
        <label className="filter-field"><span>{copy.source}</span><select className="ui-select" value={source} onChange={(event) => setSource(event.target.value)}>{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="filter-field"><span>{copy.date}</span><select className="ui-select" value={date} onChange={(event) => setDate(event.target.value)}><option value="all">{allLabel}</option><option value="today">{locale === "en" ? "Last 24 hours" : "Son 24 saat"}</option><option value="week">{locale === "en" ? "Last 7 days" : "Son 7 gün"}</option></select></label>
        <label className="filter-field"><span>{copy.asset}</span><select className="ui-select" value={asset} onChange={(event) => setAsset(event.target.value)}>{assets.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="filter-field"><span>{copy.impact}</span><select className="ui-select" value={impact} onChange={(event) => setImpact(event.target.value)}><option value="all">{allLabel}</option><option value="high">{impactLabel("high", locale)}</option><option value="medium">{impactLabel("medium", locale)}</option><option value="low">{impactLabel("low", locale)}</option></select></label>
      </div><div className="sort-row"><span>{copy.sort}</span><select className="ui-select" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{copy.newest}</option><option value="source">{copy.sourceFirst}</option><option value="impact">{copy.impactFirst}</option></select><Button variant="ghost" size="sm" onClick={resetFilters}>{copy.clear}</Button></div></div>
      {loading ? <div className="news-grid feed-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton className="news-card feed-skeleton" key={index} />)}</div> : error && !news.length ? <ErrorState description={error} onRetry={() => load(true)} /> : visible.length ? <div className="news-grid feed-grid">{visible.map((article) => <NewsCard article={article} saved={saved.includes(article.id)} onSave={() => toggleSaved(article.id)} onShare={() => void share(article)} key={article.id} />)}</div> : <EmptyState title={copy.noFilter} description={copy.noFilterDesc} />}
      {error && news.length > 0 && <p className="section-warning">{error}</p>}
    </PageContainer></section>
  </>;
}
