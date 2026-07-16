"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calendarService } from "../lib/services/calendarService";
import { marketService } from "../lib/services/marketService";
import { newsService } from "../lib/services/newsService";
import type { EconomicEvent, MarketAsset, NewsArticle } from "../lib/types";
import { ChangeIndicator, formatPrice } from "./ui/cards";
import { Badge, Disclaimer, ErrorState, PageContainer, Skeleton } from "./ui/primitives";

export default function BriefPage({ type }: { type: "morning" | "evening" }) {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const applyData = ([market, feed, calendar]: Awaited<ReturnType<typeof Promise.all<[ReturnType<typeof marketService.getSnapshot>, ReturnType<typeof newsService.getNews>, ReturnType<typeof calendarService.getEvents>]>>>) => {
    setAssets(market.data);
    setNews(feed.data);
    setEvents(calendar.data);
    setError([market.error, feed.error, calendar.error].filter(Boolean).join(" · "));
    setLoading(false);
  };
  const load = () => {
    setLoading(true);
    void Promise.all([marketService.getSnapshot(), newsService.getNews("tr"), calendarService.getEvents()]).then(applyData);
  };
  useEffect(() => {
    void Promise.all([marketService.getSnapshot(), newsService.getNews("tr"), calendarService.getEvents()]).then(applyData);
  }, []);
  const sections = useMemo(() => {
    const byCategory = (names: string[]) => news.filter((item) => names.includes(item.category)).slice(0, 3);
    return type === "morning" ? [
    { title: "Bugün takip edilecek ekonomik veriler", items: events.slice(0, 4).map((item) => `${item.time} · ${item.title} (${item.country})`) },
    { title: "Önemli şirket haberleri", news: byCategory(["Şirket Haberleri", "Şirketler"]) },
    { title: "Küresel piyasaların görünümü", news: byCategory(["Dünya Ekonomisi", "Global", "Markets"]) },
    { title: "Döviz ve altın görünümü", assets: assets.filter((item) => ["USDTRY", "EURTRY", "GAUTRY", "XAUUSD"].includes(item.symbol)) },
    { title: "Kripto görünümü", assets: assets.filter((item) => ["BTC", "ETH"].includes(item.symbol)) },
    { title: "Günün riskleri", items: [...events.filter((item) => item.impactLevel === "high").map((item) => `${item.time} · ${item.title}`), ...news.filter((item) => item.impactLevel === "high").map((item) => item.title)].slice(0, 4) },
  ] : [
    { title: "BIST kapanışı", assets: assets.filter((item) => item.symbol === "XU100") },
    { title: "Döviz hareketleri", assets: assets.filter((item) => ["USDTRY", "EURTRY"].includes(item.symbol)) },
    { title: "Altın hareketleri", assets: assets.filter((item) => ["GAUTRY", "XAUUSD"].includes(item.symbol)) },
    { title: "Kripto hareketleri", assets: assets.filter((item) => ["BTC", "ETH"].includes(item.symbol)) },
    { title: "Günün en önemli haberleri", news: news.slice(0, 4) },
    { title: "Takip edilecek sonraki gelişmeler", items: events.slice(0, 5).map((item) => `${item.date} · ${item.time} · ${item.title}`) },
    ];
  }, [type, assets, news, events]);
  const title = type === "morning" ? "Sabah Özeti" : "Gün Sonu Özeti";
  const description = type === "morning" ? "Güne başlamadan önce bilmen gereken piyasa, veri ve haber başlıkları." : "Kapanış sonrası piyasalarda ne değişti, yarın hangi gelişmeler izlenecek?";
  return <>
    <section className="brief-hero"><PageContainer><div><span className="eyebrow-label">5 DAKİKADA PİYASCOPE</span><h1>{title}</h1><p>{description}</p><div><Badge tone={error ? "warning" : "positive"}>{error ? "Kısmi güncel akış" : "Güncel kaynak özeti"}</Badge><time>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" })}</time></div></div><aside><span>CANLI</span><p>{type === "morning" ? "Günün açılış görünümü" : "Günün kapanış görünümü"}</p></aside></PageContainer></section>
    <section className="content-section"><PageContainer>{loading ? <div className="brief-grid">{Array.from({ length: 6 }, (_, index) => <Skeleton className="brief-skeleton" key={index} />)}</div> : error && !assets.length && !news.length && !events.length ? <ErrorState description={error} onRetry={load} /> : <div className="brief-grid">{sections.map((section, index) => <article className="brief-section-card" key={section.title}><header><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></header>{section.items && <ul>{section.items.length ? section.items.map((item) => <li key={item}>{item}</li>) : <li>Canlı kaynakta bu bölüm için yeni kayıt bulunmuyor.</li>}</ul>}{section.assets && <div className="brief-assets">{section.assets.map((asset) => <Link href={`/varlik/${asset.symbol}`} key={asset.symbol}><span><b>{asset.symbol}</b><small>{asset.name}</small></span><strong>{formatPrice(asset.price, asset.currency)}</strong><ChangeIndicator value={asset.changePercent} compact /></Link>)}</div>}{section.news && <div className="brief-news">{section.news.length ? section.news.map((article) => <Link href={`/haber/${article.slug}`} key={article.id}><span>{article.category}</span><b>{article.title}</b><small>{article.source} · {article.readingTime} dk</small></Link>) : <span>Canlı akışta bu bölüm için haber bulunmuyor.</span>}</div>}</article>)}</div>}<Disclaimer /><nav className="brief-switch" aria-label="Diğer özet"><Link className={type === "morning" ? "active" : ""} href="/ozet/sabah">Sabah Özeti</Link><Link className={type === "evening" ? "active" : ""} href="/ozet/gun-sonu">Gün Sonu Özeti</Link></nav></PageContainer></section>
  </>;
}
