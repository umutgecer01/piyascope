"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookmarkCheck,
  CalendarClock,
  Clock3,
  Eye,
  Gauge,
  LineChart,
  Newspaper,
  Radar,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { calendarService } from "../lib/services/calendarService";
import { alertService } from "../lib/services/alertService";
import { calculateNewsSentiment } from "../lib/analysis";
import { marketService } from "../lib/services/marketService";
import { newsService } from "../lib/services/newsService";
import { watchlistService } from "../lib/services/watchlistService";
import type { EconomicEvent, MarketAsset, NewsArticle, PriceAlert, ServiceResult, SiteLocale, WatchlistItem } from "../lib/types";
import { useToast } from "./Providers";
import { ChangeIndicator, formatPrice, MarketCard, NewsCard } from "./ui/cards";
import { Badge, ButtonLink, Disclaimer, EmptyState, ErrorState, PageContainer, SectionHeader, Skeleton } from "./ui/primitives";

type SectionState<T> = {
  data: T;
  loading: boolean;
  error: string;
  updatedAt?: string;
};

type NewsImpact = {
  tone: "positive" | "negative" | "warning" | "neutral";
  label: string;
  description: string;
};

const COPY = {
  tr: {
    eyebrow: "FINANSAL ZEKA, SADELESTIRILMIS",
    title: "Veriyi gor. Etkiyi anla.",
    lead: "Ekonomi haberlerini, piyasa verilerini ve kaynakli analizleri tek ekranda takip et.",
    markets: "Piyasalari Incele",
    brief: "Gunun Ozetini Oku",
    heroNoteSource: "Resmi kaynak baglantilari",
    heroNoteConfidence: "Seffaf guven seviyesi",
    heroNoteRefresh: "Bolum bazli canli akis",
    liveRadar: "Canli Radar",
    waitingForData: "Veri bekleniyor",
    updated: "Guncellendi",
    strongestMove: "En sert hareket",
    focusNews: "Odak haber",
    nextRisk: "Yaklasan risk",
    radarEyebrow: "BUGUNUN RADAR OZETI",
    radarTitle: "Ilk bakista piyasa resmi",
    radarDescription: "Fiyat hareketi, haber etkisi, takvim riski ve genel duyarlilik tek karar panelinde toplanir.",
    personalEyebrow: "BENIM RADARIM",
    personalTitle: "Takip ettiklerin one ciksin",
    personalDescription: "Takip listesi, kaydedilen haberler ve aktif alarmlar cihazinda saklanir; ana sayfa onceligini buna gore kurar.",
    marketsEyebrow: "GUNUN PIYASA OZETI",
    marketsTitle: "Piyasada bugun ne oluyor?",
    marketsDescription: "Borsa, doviz, altin ve kripto degerleri kaynak ve guncellik bilgisiyle birlikte gosterilir.",
    newsEyebrow: "GUNUN ONEMLI GELISMELERI",
    newsTitle: "Gurultuyu azaltan bes baslik",
    newsDescription: "Haberleri sadece listelemek yerine hangi varliklari etkileyebilecegini de gosterir.",
    allNews: "Tum haberler",
    calendarEyebrow: "EKONOMIK TAKVIM",
    calendarTitle: "Yaklasan onemli olaylar",
    calendarDescription: "Saat, beklenti ve onceki degerlere ek olarak geri sayim ve muhtemel piyasa etkisi gosterilir.",
    fullCalendar: "Takvimin tamami",
    sentimentEyebrow: "PIYASA DUYARLILIGI",
    sentimentDescription: "Dagilim, mevcut canli haber basliklari ve ozetlerindeki ifade sinyallerinden otomatik hesaplanir.",
    disclaimer: "Bu icerik yalnizca bilgilendirme amaclidir ve yatirim tavsiyesi degildir.",
  },
  en: {
    eyebrow: "FINANCIAL INTELLIGENCE, SIMPLIFIED",
    title: "See the data. Understand the impact.",
    lead: "Follow economic news, market data and source-aware analysis from one focused workspace.",
    markets: "Explore Markets",
    brief: "Read Today's Brief",
    heroNoteSource: "Official source links",
    heroNoteConfidence: "Transparent confidence",
    heroNoteRefresh: "Section-level live flow",
    liveRadar: "Live Radar",
    waitingForData: "Waiting for data",
    updated: "Updated",
    strongestMove: "Strongest move",
    focusNews: "Focus news",
    nextRisk: "Upcoming risk",
    radarEyebrow: "TODAY'S RADAR",
    radarTitle: "The market picture at a glance",
    radarDescription: "Price action, news impact, calendar risk and sentiment are combined in one decision panel.",
    personalEyebrow: "MY RADAR",
    personalTitle: "Prioritize what you follow",
    personalDescription: "Watchlist items, saved news and active alerts stay on-device and shape the homepage priority.",
    marketsEyebrow: "MARKET SNAPSHOT",
    marketsTitle: "What is moving today?",
    marketsDescription: "Stocks, FX, gold and crypto are shown with source and freshness context.",
    newsEyebrow: "KEY DEVELOPMENTS",
    newsTitle: "Five headlines with less noise",
    newsDescription: "News is paired with a visible map of the assets it may affect.",
    allNews: "All news",
    calendarEyebrow: "ECONOMIC CALENDAR",
    calendarTitle: "Upcoming high-impact events",
    calendarDescription: "Countdowns and likely affected markets sit next to time, forecast and previous values.",
    fullCalendar: "Full calendar",
    sentimentEyebrow: "MARKET SENTIMENT",
    sentimentDescription: "The distribution is calculated from live headline and summary language signals.",
    disclaimer: "This content is for information only and is not investment advice.",
  },
} as const;

const CATEGORY_FALLBACK_ASSETS: Array<[RegExp, string[]]> = [
  [/kripto|crypto|bitcoin|ethereum/i, ["BTC", "ETH"]],
  [/altin|gold|metal/i, ["GAUTRY", "XAUUSD"]],
  [/doviz|fx|currency|kur/i, ["USDTRY", "EURTRY"]],
  [/borsa|stock|equity|piyasa/i, ["XU100"]],
  [/enerji|energy|oil|petrol/i, ["XAUUSD", "USDTRY"]],
  [/teknoloji|technology|ai/i, ["BTC", "XU100"]],
];

function emptyState<T>(data: T): SectionState<T> {
  return { data, loading: true, error: "" };
}

function resultState<T>(result: ServiceResult<T>): SectionState<T> {
  return {
    data: result.data,
    loading: false,
    error: result.error ?? "",
    updatedAt: result.updatedAt,
  };
}

function failedState<T>(fallback: T, error: unknown): SectionState<T> {
  return {
    data: fallback,
    loading: false,
    error: error instanceof Error ? error.message : "Veri alinamadi.",
    updatedAt: new Date().toISOString(),
  };
}

function formatUpdateTime(value: string | undefined, locale: SiteLocale) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatEventDate(event: EconomicEvent, locale: SiteLocale) {
  return new Date(`${event.date}T00:00:00`).toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function eventDateTime(event: EconomicEvent) {
  const time = /^\d{1,2}:\d{2}$/.test(event.time) ? event.time.padStart(5, "0") : "12:00";
  return new Date(`${event.date}T${time}:00`);
}

function timeUntilEvent(event: EconomicEvent, locale: SiteLocale) {
  const diff = eventDateTime(event).getTime() - Date.now();
  if (diff <= -60 * 60 * 1000) return locale === "en" ? "Passed" : "Gecti";
  if (diff <= 0) return locale === "en" ? "Now" : "Simdi";
  const totalMinutes = Math.ceil(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return locale === "en" ? `${days}d ${hours}h` : `${days} gun ${hours} sa`;
  if (hours > 0) return locale === "en" ? `${hours}h ${minutes}m` : `${hours} sa ${minutes} dk`;
  return locale === "en" ? `${minutes}m` : `${minutes} dk`;
}

function impactedAssetsForEvent(event: EconomicEvent) {
  const base: Record<EconomicEvent["country"], string[]> = {
    TR: ["XU100", "USDTRY", "GAUTRY"],
    US: ["USDTRY", "XAUUSD", "BTC"],
    EU: ["EURTRY", "XAUUSD", "XU100"],
    GB: ["USDTRY", "EURTRY"],
    CN: ["XAUUSD", "BTC"],
    GLOBAL: ["XU100", "USDTRY", "BTC"],
  };
  const title = event.title.toLocaleLowerCase("tr-TR");
  const extra = /faiz|fed|ecb|enflasyon|inflation|rate/.test(title) ? ["XAUUSD", "GAUTRY"] : [];
  return Array.from(new Set([...(base[event.country] ?? ["XU100"]), ...extra])).slice(0, 4);
}

function fallbackAssetsForArticle(article: NewsArticle) {
  if (article.relatedAssets.length) return article.relatedAssets.slice(0, 4);
  const text = `${article.category} ${article.title}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_FALLBACK_ASSETS.find(([pattern]) => pattern.test(text))?.[1] ?? ["XU100"];
}

function getNewsImpact(article: NewsArticle): NewsImpact {
  const text = `${article.title} ${article.summary}`.toLocaleLowerCase("tr-TR");
  const positive = /yuksel|artis|guclen|toparlan|rekor|kazanc|ralli|buyume|increase|growth|gain|record/.test(text);
  const negative = /dus|gerile|azal|baski|kriz|kayip|zayif|risk|drop|fall|loss|pressure/.test(text);
  if (negative && !positive) {
    return { tone: "negative", label: "Baski riski", description: "Fiyatlama uzerinde negatif hassasiyet olusturabilir." };
  }
  if (positive && !negative) {
    return { tone: "positive", label: "Destek sinyali", description: "Ilgili varliklarda pozitif algiyi guclendirebilir." };
  }
  if (article.impactLevel === "high") {
    return { tone: "warning", label: "Yuksek etki", description: "Yon icin ek kaynak ve fiyat teyidi gerektirir." };
  }
  return { tone: "neutral", label: "Izleme modu", description: "Etki seviyesi kaynak akisiyle birlikte izlenmeli." };
}

function findTopMover(assets: MarketAsset[]) {
  return [...assets].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
}

function findFocusNews(news: NewsArticle[]) {
  return news.find((article) => article.impactLevel === "high") ?? news[0];
}

function findFocusEvent(events: EconomicEvent[]) {
  return [...events].sort((a, b) => {
    const impactA = a.impactLevel === "high" ? 0 : a.impactLevel === "medium" ? 1 : 2;
    const impactB = b.impactLevel === "high" ? 0 : b.impactLevel === "medium" ? 1 : 2;
    return impactA - impactB || eventDateTime(a).getTime() - eventDateTime(b).getTime();
  })[0];
}

export default function HomeDashboard({ locale = "tr" }: { locale?: SiteLocale }) {
  const copy = COPY[locale];
  const [marketState, setMarketState] = useState<SectionState<MarketAsset[]>>(emptyState([]));
  const [newsState, setNewsState] = useState<SectionState<NewsArticle[]>>(emptyState([]));
  const [calendarState, setCalendarState] = useState<SectionState<EconomicEvent[]>>(emptyState([]));
  const [saved, setSaved] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const { push } = useToast();

  const loadMarkets = useCallback(() => {
    setMarketState((current) => ({ ...current, loading: true, error: "" }));
    void marketService.getSnapshot().then((result) => setMarketState(resultState(result))).catch((error) => setMarketState(failedState([], error)));
  }, []);

  const loadNews = useCallback(() => {
    setNewsState((current) => ({ ...current, loading: true, error: "" }));
    void newsService.getNews(locale).then((result) => setNewsState(resultState(result))).catch((error) => setNewsState(failedState([], error)));
  }, [locale]);

  const loadEvents = useCallback(() => {
    setCalendarState((current) => ({ ...current, loading: true, error: "" }));
    void calendarService.getEvents(locale).then((result) => setCalendarState(resultState(result))).catch((error) => setCalendarState(failedState([], error)));
  }, [locale]);

  const loadLocalState = useCallback(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem("piyascope.saved-news.v1") ?? "[]") as string[]);
    } catch {
      setSaved([]);
    }
    setWatchlist(watchlistService.list());
    setAlerts(alertService.list());
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      loadMarkets();
      loadNews();
      loadEvents();
    });
    return () => { cancelled = true; };
  }, [loadMarkets, loadNews, loadEvents]);

  useEffect(() => {
    queueMicrotask(loadLocalState);
    window.addEventListener("storage", loadLocalState);
    window.addEventListener("piyascope:watchlist", loadLocalState);
    return () => {
      window.removeEventListener("storage", loadLocalState);
      window.removeEventListener("piyascope:watchlist", loadLocalState);
    };
  }, [loadLocalState]);

  const assets = marketState.data;
  const news = newsState.data;
  const events = calendarState.data;
  const summaryAssets = useMemo(() => {
    const preferred = ["XU100", "USDTRY", "GAUTRY", "BTC"].map((symbol) => assets.find((item) => item.symbol === symbol)).filter(Boolean) as MarketAsset[];
    return preferred.length ? preferred : assets.slice(0, 4);
  }, [assets]);
  const gainers = useMemo(() => [...assets].sort((a, b) => b.changePercent - a.changePercent)[0], [assets]);
  const losers = useMemo(() => [...assets].sort((a, b) => a.changePercent - b.changePercent)[0], [assets]);
  const topMover = useMemo(() => findTopMover(assets), [assets]);
  const focusNews = useMemo(() => findFocusNews(news), [news]);
  const focusEvent = useMemo(() => findFocusEvent(events), [events]);
  const sentiment = useMemo(() => calculateNewsSentiment(news), [news]);
  const watchlistAssets = useMemo(() => watchlist
    .filter((item) => item.assetSymbol)
    .sort((a, b) => a.order - b.order)
    .map((item) => assets.find((asset) => asset.symbol === item.assetSymbol))
    .filter(Boolean) as MarketAsset[], [assets, watchlist]);
  const watchlistCategories = useMemo(() => watchlist.filter((item) => item.category).map((item) => item.category as string), [watchlist]);
  const savedArticles = useMemo(() => news.filter((article) => saved.includes(article.id)), [news, saved]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("piyascope.saved-news.v1", JSON.stringify(next));
      push(next.includes(id) ? (locale === "en" ? "News saved." : "Haber kaydedildi.") : (locale === "en" ? "News removed from saved." : "Haber kayitlardan cikarildi."), "success");
      return next;
    });
  };

  const share = async (article: NewsArticle) => {
    const url = `${location.origin}/haber/${article.slug}`;
    if (navigator.share) {
      await navigator.share({ title: article.title, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      push(locale === "en" ? "News link copied." : "Haber baglantisi kopyalandi.", "success");
    }
  };

  return <>
    <HeroSection
      copy={copy}
      locale={locale}
      loading={marketState.loading}
      summaryAssets={summaryAssets}
      topMover={topMover}
      focusNews={focusNews}
      focusEvent={focusEvent}
      updatedAt={marketState.updatedAt}
    />
    <RadarOverview
      copy={copy}
      locale={locale}
      topMover={topMover}
      focusNews={focusNews}
      focusEvent={focusEvent}
      sentiment={sentiment}
      loading={marketState.loading || newsState.loading || calendarState.loading}
    />
    <PersonalRadarPanel
      copy={copy}
      locale={locale}
      watchlistAssets={watchlistAssets}
      watchlistCategories={watchlistCategories}
      savedArticles={savedArticles}
      alerts={alerts}
      assets={assets}
    />
    <MarketSummarySection
      copy={copy}
      locale={locale}
      state={marketState}
      summaryAssets={summaryAssets}
      gainers={gainers}
      losers={losers}
      topMover={topMover}
      onRetry={loadMarkets}
    />
    <NewsSection
      copy={copy}
      locale={locale}
      state={newsState}
      saved={saved}
      onRetry={loadNews}
      onSave={toggleSaved}
      onShare={share}
    />
    <CalendarPreviewSection
      copy={copy}
      locale={locale}
      state={calendarState}
      onRetry={loadEvents}
    />
    <SentimentSection copy={copy} locale={locale} sentiment={sentiment} />
  </>;
}

function HeroSection({
  copy,
  locale,
  loading,
  summaryAssets,
  topMover,
  focusNews,
  focusEvent,
  updatedAt,
}: {
  copy: typeof COPY[SiteLocale];
  locale: SiteLocale;
  loading: boolean;
  summaryAssets: MarketAsset[];
  topMover?: MarketAsset;
  focusNews?: NewsArticle;
  focusEvent?: EconomicEvent;
  updatedAt?: string;
}) {
  const updateLabel = formatUpdateTime(updatedAt, locale);
  return <section className="page-hero">
    <PageContainer className="hero-grid">
      <div className="hero-copy">
        <span className="eyebrow-label">{copy.eyebrow}</span>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
        <div className="hero-actions">
          <ButtonLink href={locale === "en" ? "/en/markets" : "/piyasalar"}>
            <LineChart className="inline-icon" aria-hidden="true" />{copy.markets}
          </ButtonLink>
          <ButtonLink href="/ozet/sabah" variant="secondary">
            <Newspaper className="inline-icon" aria-hidden="true" />{copy.brief}
          </ButtonLink>
        </div>
        <div className="hero-note">
          <span><Eye className="inline-icon" aria-hidden="true" />{copy.heroNoteSource}</span>
          <span><Gauge className="inline-icon" aria-hidden="true" />{copy.heroNoteConfidence}</span>
          <span><Activity className="inline-icon" aria-hidden="true" />{copy.heroNoteRefresh}</span>
        </div>
      </div>
      <div className="hero-visual" aria-label="Piyasa ve haber radari">
        <div className="hero-live-panel">
          <header>
            <span><Radar className="inline-icon" aria-hidden="true" />{copy.liveRadar}</span>
            <Badge tone={updateLabel ? "positive" : "neutral"}>{updateLabel ? `${copy.updated} ${updateLabel}` : copy.waitingForData}</Badge>
          </header>
          <div className="hero-signal-grid">
            <SignalTile
              icon={<LineChart className="inline-icon" aria-hidden="true" />}
              label={copy.strongestMove}
              value={topMover?.symbol ?? copy.waitingForData}
              detail={topMover ? `${topMover.changePercent >= 0 ? "+" : ""}${topMover.changePercent.toFixed(2)}%` : ""}
              tone={topMover && topMover.changePercent < 0 ? "negative" : "positive"}
            />
            <SignalTile
              icon={<Newspaper className="inline-icon" aria-hidden="true" />}
              label={copy.focusNews}
              value={focusNews?.category ?? copy.waitingForData}
              detail={focusNews?.title ?? ""}
              tone={focusNews?.impactLevel === "high" ? "warning" : "neutral"}
            />
            <SignalTile
              icon={<CalendarClock className="inline-icon" aria-hidden="true" />}
              label={copy.nextRisk}
              value={focusEvent ? timeUntilEvent(focusEvent, locale) : copy.waitingForData}
              detail={focusEvent?.title ?? ""}
              tone={focusEvent?.impactLevel === "high" ? "warning" : "neutral"}
            />
          </div>
        </div>
        <div className="hero-market-stack">
          {loading ? Array.from({ length: 4 }, (_, index) => <Skeleton className="market-card" key={index} />) : summaryAssets.map((asset) => <MarketCard compact asset={asset} key={asset.symbol} />)}
        </div>
        <div className="hero-chart-line" aria-hidden="true" />
      </div>
    </PageContainer>
  </section>;
}

function SignalTile({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail?: string; tone: "positive" | "negative" | "warning" | "neutral" }) {
  return <article className={`signal-tile signal-${tone}`}>
    <span>{icon}{label}</span>
    <strong>{value}</strong>
    {detail && <p>{detail}</p>}
  </article>;
}

function RadarOverview({
  copy,
  locale,
  topMover,
  focusNews,
  focusEvent,
  sentiment,
  loading,
}: {
  copy: typeof COPY[SiteLocale];
  locale: SiteLocale;
  topMover?: MarketAsset;
  focusNews?: NewsArticle;
  focusEvent?: EconomicEvent;
  sentiment: ReturnType<typeof calculateNewsSentiment>;
  loading: boolean;
}) {
  return <section className="content-section radar-section">
    <PageContainer>
      <SectionHeader eyebrow={copy.radarEyebrow} title={copy.radarTitle} description={copy.radarDescription} action={<Badge tone={loading ? "neutral" : "positive"}>{loading ? copy.waitingForData : copy.liveRadar}</Badge>} />
      <div className="radar-grid">
        <article className="radar-card">
          <span><LineChart className="inline-icon" aria-hidden="true" />{copy.strongestMove}</span>
          <strong>{topMover?.symbol ?? "-"}</strong>
          <p>{topMover ? `${topMover.name} ${topMover.changePercent >= 0 ? "yukari" : "asagi"} %{Math.abs(topMover.changePercent).toFixed(2)} hareket etti.` : "Piyasa verisi bekleniyor."}</p>
        </article>
        <article className="radar-card radar-card-wide">
          <span><Newspaper className="inline-icon" aria-hidden="true" />{copy.focusNews}</span>
          <strong>{focusNews?.title ?? "-"}</strong>
          <div className="signal-tag-list">
            {(focusNews ? fallbackAssetsForArticle(focusNews) : []).map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol}</Link>)}
            {focusNews && <Badge tone={focusNews.impactLevel === "high" ? "negative" : "warning"}>{getNewsImpact(focusNews).label}</Badge>}
          </div>
        </article>
        <article className="radar-card">
          <span><CalendarClock className="inline-icon" aria-hidden="true" />{copy.nextRisk}</span>
          <strong>{focusEvent ? timeUntilEvent(focusEvent, locale) : "-"}</strong>
          <p>{focusEvent ? focusEvent.title : "Yaklasan takvim verisi bekleniyor."}</p>
        </article>
        <article className="radar-card">
          <span><Sparkles className="inline-icon" aria-hidden="true" />{copy.sentimentEyebrow}</span>
          <strong>{sentiment.tone}</strong>
          <p>{sentiment.sampleSize ? `%${sentiment.positive} pozitif, %${sentiment.negative} negatif haber sinyali.` : "Duyarlilik icin haber akisi bekleniyor."}</p>
        </article>
      </div>
    </PageContainer>
  </section>;
}

function PersonalRadarPanel({
  copy,
  locale,
  watchlistAssets,
  watchlistCategories,
  savedArticles,
  alerts,
  assets,
}: {
  copy: typeof COPY[SiteLocale];
  locale: SiteLocale;
  watchlistAssets: MarketAsset[];
  watchlistCategories: string[];
  savedArticles: NewsArticle[];
  alerts: PriceAlert[];
  assets: MarketAsset[];
}) {
  const activeAlerts = alerts.filter((alert) => alert.isActive);
  const trackedMover = findTopMover(watchlistAssets);
  const hasPersonalData = watchlistAssets.length || watchlistCategories.length || savedArticles.length || activeAlerts.length;

  return <section className="content-section alt personal-section">
    <PageContainer>
      <SectionHeader eyebrow={copy.personalEyebrow} title={copy.personalTitle} description={copy.personalDescription} action={<ButtonLink href="/takip-listem" variant="secondary"><Star className="inline-icon" aria-hidden="true" />{locale === "en" ? "Watchlist" : "Takip Listem"}</ButtonLink>} />
      {hasPersonalData ? <div className="personal-grid">
        <article className="personal-summary-card">
          <span><Radar className="inline-icon" aria-hidden="true" />{locale === "en" ? "Tracked mover" : "Takipteki hareket"}</span>
          <strong>{trackedMover?.symbol ?? "-"}</strong>
          <p>{trackedMover ? `${trackedMover.name} icin gunluk degisim %{Math.abs(trackedMover.changePercent).toFixed(2)}.` : (locale === "en" ? "No priced watchlist asset yet." : "Fiyatlanan takip varligi henuz yok.")}</p>
        </article>
        <div className="watchlist-mini-list">
          {watchlistAssets.slice(0, 4).map((asset) => <Link href={`/varlik/${asset.symbol}`} key={asset.symbol}>
            <span><b>{asset.symbol}</b><small>{asset.name}</small></span>
            <strong>{formatPrice(asset.price, asset.currency)}</strong>
            <ChangeIndicator value={asset.changePercent} compact />
          </Link>)}
          {!watchlistAssets.length && watchlistCategories.map((category) => <Link href={`/haberler?category=${encodeURIComponent(category)}`} key={category}>
            <span><b>{category}</b><small>{locale === "en" ? "Followed category" : "Takip edilen kategori"}</small></span>
            <ArrowRight className="inline-icon" aria-hidden="true" />
          </Link>)}
        </div>
        <div className="personal-side-stack">
          <article className="mini-stat-card">
            <span><BookmarkCheck className="inline-icon" aria-hidden="true" />{locale === "en" ? "Saved news" : "Kayitli haber"}</span>
            <strong>{savedArticles.length}</strong>
            {savedArticles[0] && <Link href={`/haber/${savedArticles[0].slug}`}>{savedArticles[0].title}</Link>}
          </article>
          <article className="mini-stat-card">
            <span><Bell className="inline-icon" aria-hidden="true" />{locale === "en" ? "Active alerts" : "Aktif alarm"}</span>
            <strong>{activeAlerts.length}</strong>
            {activeAlerts.slice(0, 2).map((alert) => {
              const asset = assets.find((item) => item.symbol === alert.assetSymbol);
              return <small key={alert.id}>{alert.assetSymbol} {alert.condition === "above" ? ">=" : "<="} {asset ? formatPrice(alert.targetPrice, asset.currency) : alert.targetPrice.toLocaleString("tr-TR")}</small>;
            })}
          </article>
        </div>
      </div> : <div className="personal-empty">
        <EmptyState
          title={locale === "en" ? "Your radar is empty" : "Kisisel radarin bos"}
          description={locale === "en" ? "Add assets to your watchlist, save news or create price alerts to personalize this area." : "Takip listene varlik ekle, haber kaydet veya fiyat alarmi kur; bu alan sana gore onceliklensin."}
          action={<div className="empty-actions"><ButtonLink href="/takip-listem"><Star className="inline-icon" aria-hidden="true" />{locale === "en" ? "Add asset" : "Varlik ekle"}</ButtonLink><ButtonLink href="/alarmlar" variant="secondary"><Bell className="inline-icon" aria-hidden="true" />{locale === "en" ? "Create alert" : "Alarm kur"}</ButtonLink></div>}
        />
      </div>}
    </PageContainer>
  </section>;
}

function MarketSummarySection({
  copy,
  locale,
  state,
  summaryAssets,
  gainers,
  losers,
  topMover,
  onRetry,
}: {
  copy: typeof COPY[SiteLocale];
  locale: SiteLocale;
  state: SectionState<MarketAsset[]>;
  summaryAssets: MarketAsset[];
  gainers?: MarketAsset;
  losers?: MarketAsset;
  topMover?: MarketAsset;
  onRetry(): void;
}) {
  const status = state.error ? (state.data.length ? "warning" : "negative") : "positive";
  return <section className="content-section">
    <PageContainer>
      <SectionHeader eyebrow={copy.marketsEyebrow} title={copy.marketsTitle} description={copy.marketsDescription} action={<Badge tone={status}>{state.error ? (state.data.length ? "Kismi akis" : "Veri sorunu") : "Guncel kaynaklar"}</Badge>} />
      {state.loading ? <div className="market-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton className="market-card" key={index} />)}</div> : state.error && !state.data.length ? <ErrorState description={state.error} onRetry={onRetry} /> : <div className="market-grid">
        {summaryAssets.map((asset) => <MarketCard asset={asset} key={asset.symbol} />)}
        {gainers && <article className="analysis-card analysis-positive"><span><ArrowUpRight className="inline-icon" aria-hidden="true" />{locale === "en" ? "Top gainer" : "En cok yukselen"}</span><strong>{gainers.symbol}</strong><p>Yukselis %{gainers.changePercent.toFixed(2)}</p></article>}
        {losers && <article className="analysis-card analysis-negative"><span><ArrowDownRight className="inline-icon" aria-hidden="true" />{locale === "en" ? "Top loser" : "En cok dusen"}</span><strong>{losers.symbol}</strong><p>Dusus %{Math.abs(losers.changePercent).toFixed(2)}</p></article>}
        {topMover && <article className="analysis-card analysis-accent"><span><Activity className="inline-icon" aria-hidden="true" />{copy.strongestMove}</span><strong>{topMover.symbol}</strong><p>{topMover.sourceName} verisine gore en yuksek mutlak hareket.</p></article>}
      </div>}
      {state.error && state.data.length > 0 && <p className="section-warning"><AlertTriangle className="inline-icon" aria-hidden="true" />{state.error}</p>}
    </PageContainer>
  </section>;
}

function NewsSection({
  copy,
  locale,
  state,
  saved,
  onRetry,
  onSave,
  onShare,
}: {
  copy: typeof COPY[SiteLocale];
  locale: SiteLocale;
  state: SectionState<NewsArticle[]>;
  saved: string[];
  onRetry(): void;
  onSave(id: string): void;
  onShare(article: NewsArticle): void;
}) {
  const news = state.data;
  return <section className="content-section alt">
    <PageContainer>
      <SectionHeader eyebrow={copy.newsEyebrow} title={copy.newsTitle} description={copy.newsDescription} action={<Link className="ui-button button-secondary button-md" href={locale === "en" ? "/en/news-radar" : "/haberler"}><Newspaper className="inline-icon" aria-hidden="true" />{copy.allNews}<ArrowRight className="inline-icon" aria-hidden="true" /></Link>} />
      {state.loading ? <div className="news-grid">{Array.from({ length: 3 }, (_, index) => <Skeleton className="news-card" key={index} />)}</div> : state.error && !news.length ? <ErrorState description={state.error} onRetry={onRetry} /> : news.length ? <>
        <div className="news-grid">{news.slice(0, 5).map((article, index) => <NewsCard article={article} featured={index === 0} saved={saved.includes(article.id)} onSave={() => onSave(article.id)} onShare={() => onShare(article)} key={article.id} />)}</div>
        <NewsImpactMap locale={locale} news={news.slice(0, 5)} />
      </> : <EmptyState title={locale === "en" ? "Live news is unavailable" : "Canli haber alinamadi"} description={locale === "en" ? "When sources do not respond, Piyascope does not invent content." : "Kaynaklar yanit vermediginde icerik uydurulmaz. Birkaç dakika sonra yeniden deneyebilirsin."} />}
      {state.error && news.length > 0 && <p className="section-warning"><AlertTriangle className="inline-icon" aria-hidden="true" />{state.error}</p>}
    </PageContainer>
  </section>;
}

function NewsImpactMap({ locale, news }: { locale: SiteLocale; news: NewsArticle[] }) {
  return <aside className="news-impact-map">
    <header>
      <span><Share2 className="inline-icon" aria-hidden="true" />{locale === "en" ? "Impact map" : "Haber etki haritasi"}</span>
      <p>{locale === "en" ? "A quick view of what each headline may affect." : "Her basligin hangi varliklari etkileyebilecegine hizli bakis."}</p>
    </header>
    <div>
      {news.map((article) => {
        const impact = getNewsImpact(article);
        return <article className={`impact-row impact-${impact.tone}`} key={article.id}>
          <div>
            <Badge tone={impact.tone}>{impact.label}</Badge>
            <h3>{article.title}</h3>
            <p>{impact.description}</p>
          </div>
          <div className="impact-assets">
            {fallbackAssetsForArticle(article).map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol}</Link>)}
          </div>
        </article>;
      })}
    </div>
  </aside>;
}

function CalendarPreviewSection({ copy, locale, state, onRetry }: { copy: typeof COPY[SiteLocale]; locale: SiteLocale; state: SectionState<EconomicEvent[]>; onRetry(): void }) {
  return <section className="content-section">
    <PageContainer>
      <SectionHeader eyebrow={copy.calendarEyebrow} title={copy.calendarTitle} description={copy.calendarDescription} action={<ButtonLink href={locale === "en" ? "/en/agenda" : "/ekonomik-takvim"} variant="secondary"><CalendarClock className="inline-icon" aria-hidden="true" />{copy.fullCalendar}<ArrowRight className="inline-icon" aria-hidden="true" /></ButtonLink>} />
      {state.loading ? <div className="event-preview-grid">{Array.from({ length: 5 }, (_, index) => <Skeleton className="event-preview" key={index} />)}</div> : state.error && !state.data.length ? <ErrorState description={state.error} onRetry={onRetry} /> : state.data.length ? <div className="event-preview-grid">{state.data.slice(0, 5).map((event) => <EventPreviewCard event={event} locale={locale} key={event.id} />)}</div> : <EmptyState title={locale === "en" ? "No upcoming events" : "Yaklasan olay bulunamadi"} description={locale === "en" ? "There are no new selected-country events in the weekly live calendar." : "Haftalik canli takvimde secili ulkeler icin yeni olay bulunmuyor."} />}
      {state.error && state.data.length > 0 && <p className="section-warning"><AlertTriangle className="inline-icon" aria-hidden="true" />{state.error}</p>}
    </PageContainer>
  </section>;
}

function EventPreviewCard({ event, locale }: { event: EconomicEvent; locale: SiteLocale }) {
  const countdown = timeUntilEvent(event, locale);
  const assets = impactedAssetsForEvent(event);
  return <article className="event-preview">
    <div>
      <Badge tone={event.impactLevel === "high" ? "negative" : "warning"}>{event.impactLevel === "high" ? (locale === "en" ? "High impact" : "Yuksek etki") : (locale === "en" ? "Medium impact" : "Orta etki")}</Badge>
      <span>{event.country}</span>
    </div>
    <time dateTime={`${event.date}T${event.time}`}><Clock3 className="inline-icon" aria-hidden="true" />{formatEventDate(event, locale)} · {event.time}</time>
    <h3>{event.title}</h3>
    <div className="event-countdown"><CalendarClock className="inline-icon" aria-hidden="true" /><span>{locale === "en" ? "Countdown" : "Geri sayim"}</span><b>{countdown}</b></div>
    <div className="event-assets">
      {assets.map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol}</Link>)}
    </div>
    <footer>
      <span>{locale === "en" ? "Previous" : "Onceki"} <b>{event.previous}</b></span>
      <span>{locale === "en" ? "Forecast" : "Beklenti"} <b>{event.forecast}</b></span>
    </footer>
  </article>;
}

function SentimentSection({ copy, locale, sentiment }: { copy: typeof COPY[SiteLocale]; locale: SiteLocale; sentiment: ReturnType<typeof calculateNewsSentiment> }) {
  return <section className="content-section sentiment-section">
    <PageContainer className="sentiment-layout">
      <div>
        <span className="eyebrow-label">{copy.sentimentEyebrow}</span>
        <h2>{sentiment.tone}</h2>
        <p>{copy.sentimentDescription}</p>
        <Badge tone={sentiment.sampleSize ? "positive" : "neutral"}>{sentiment.sampleSize ? `${sentiment.sampleSize} ${locale === "en" ? "news analyzed" : "haber analiz edildi"}` : copy.waitingForData}</Badge>
      </div>
      <div className="sentiment-meter" aria-label={sentiment.sampleSize ? `Pozitif yuzde ${sentiment.positive}, notr yuzde ${sentiment.neutral}, negatif yuzde ${sentiment.negative}` : "Duyarlilik icin canli haber bekleniyor"}>
        <div className="sentiment-track"><i className="sentiment-positive" style={{ width: `${sentiment.positive}%` }} /><i className="sentiment-neutral" style={{ width: `${sentiment.neutral}%` }} /><i className="sentiment-negative" style={{ width: `${sentiment.negative}%` }} /></div>
        <div className="sentiment-labels">
          <span><i className="positive-dot" />{locale === "en" ? "Positive" : "Pozitif"} <b>%{sentiment.positive}</b></span>
          <span><i className="neutral-dot" />{locale === "en" ? "Neutral" : "Notr"} <b>%{sentiment.neutral}</b></span>
          <span><i className="negative-dot" />{locale === "en" ? "Negative" : "Negatif"} <b>%{sentiment.negative}</b></span>
        </div>
        <small>{sentiment.updatedAt ? `${locale === "en" ? "Last calculation" : "Son hesaplama"}: ${new Date(sentiment.updatedAt).toLocaleTimeString(locale === "en" ? "en-US" : "tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })} · ${locale === "en" ? "News flow analysis" : "Haber akisi analizi"}` : (locale === "en" ? "Waiting for live news" : "Hesaplama icin canli haber bekleniyor")}</small>
      </div>
      <Disclaimer>{copy.disclaimer}</Disclaimer>
    </PageContainer>
  </section>;
}
