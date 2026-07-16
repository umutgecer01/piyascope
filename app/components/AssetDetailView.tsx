"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Bell, Bookmark, BookmarkCheck, ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { aiService } from "../lib/services/aiService";
import { marketService } from "../lib/services/marketService";
import { newsService } from "../lib/services/newsService";
import { watchlistService } from "../lib/services/watchlistService";
import type { AIAnalysis, MarketAsset, NewsArticle, PricePoint, TimeRange } from "../lib/types";
import { useToast } from "./Providers";
import { ChangeIndicator, formatPrice, NewsCard } from "./ui/cards";
import { Badge, Button, ButtonLink, Disclaimer, EmptyState, PageContainer, Skeleton, Tabs } from "./ui/primitives";

const PriceChart = dynamic(() => import("./UPlotChart"), { ssr: false, loading: () => <Skeleton className="chart-skeleton" /> });
const ranges: TimeRange[] = ["1G", "1H", "1A", "3A", "1Y", "5Y", "MAX"];
const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

export default function AssetDetailView({ symbol }: { symbol: string }) {
  const cleanSymbol = symbol.toUpperCase();
  const [asset, setAsset] = useState<MarketAsset | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historySource, setHistorySource] = useState("");
  const [historySeriesType, setHistorySeriesType] = useState<"historical" | "reference-series" | "performance-points">("performance-points");
  const [chartType, setChartType] = useState<"ohlc" | "derived-ohlc">("derived-ohlc");
  const [range, setRange] = useState<TimeRange>("1A");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assetError, setAssetError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const { push } = useToast();

  useEffect(() => {
    let cancelled = false;
    void Promise.all([marketService.getAsset(cleanSymbol), marketService.getHistory(cleanSymbol, range), newsService.getNews("tr")]).then(([assetResult, historyResult, newsResult]) => {
      if (cancelled) return;
      setAsset(assetResult.data);
      setHistory(historyResult.data);
      setHistorySource(historyResult.sourceName ?? "");
      setHistorySeriesType(historyResult.seriesType ?? "performance-points");
      setChartType(historyResult.chartType ?? "derived-ohlc");
      setAssetError(assetResult.error ?? "");
      setHistoryError(historyResult.error ?? "");
      setNews(newsResult.data.filter((item) => item.relatedAssets.includes(cleanSymbol)).slice(0, 3));
      setFollowing(watchlistService.hasAsset(cleanSymbol));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [cleanSymbol, range]);

  if (loading && !asset) return <PageContainer className="detail-loading"><Skeleton className="detail-title-skeleton" /><Skeleton className="chart-skeleton" /></PageContainer>;
  if (!asset) return <PageContainer className="detail-missing"><EmptyState title="Varlık verisi alınamadı" description={assetError || "Aradığın sembol desteklenen güncel piyasa kaynaklarında bulunamadı."} action={<ButtonLink href="/piyasalar">Piyasalara dön</ButtonLink>} /></PageContainer>;

  const toggleFollow = () => {
    const entry = watchlistService.list().find((item) => item.assetSymbol === asset.symbol);
    if (entry) watchlistService.remove(entry.id); else watchlistService.addAsset(asset.symbol);
    setFollowing(!entry);
    push(entry ? "Takip listesinden çıkarıldı." : "Takip listesine eklendi.", "success");
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      setAnalysis(await aiService.analyze({ question: `${asset.symbol} için güncel piyasa görünümünü kaynaklarla özetle.`, assetSymbol: asset.symbol }));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Güncel analiz hazırlanamadı.");
    } finally {
      setAnalyzing(false);
    }
  };

  const metric = (label: string, value: string) => <div><span>{label}</span><strong>{value}</strong></div>;
  const historyDescription = historySeriesType === "historical"
    ? `Grafik ${historySource || "sağlayıcı"} tarihsel fiyat serisinden OHLC mum görünümüne dönüştürülür; uzun aralıklarda noktalar performans için seyreltilir.`
    : historySeriesType === "reference-series"
      ? "Grafik ECB referans kapanışları ve son piyasa değerinden türetilmiş OHLC mumlar gösterir; gün içi borsa mumu değildir."
      : "Grafik, sağlayıcının gerçek dönem performanslarından hesaplanan kontrol noktalarını OHLC mum görünümünde gösterir; ara gün mumları değildir.";

  return <>
    <section className="asset-hero">
      <PageContainer>
        <nav className="breadcrumbs" aria-label="Sayfa yolu"><Link href="/piyasalar">Piyasalar</Link><span>/</span><b>{asset.symbol}</b></nav>
        <div className="asset-heading">
          <div><span className="asset-symbol">{asset.symbol}</span><h1>{asset.name}</h1><p>{asset.sector ?? ({ crypto: "Kripto varlık", fx: "Döviz", commodity: "Emtia", index: "Borsa endeksi", stock: "Hisse senedi" }[asset.assetType])}</p></div>
          <div className="asset-price"><Badge tone={asset.dataStatus === "live" ? "positive" : asset.dataStatus === "delayed" ? "warning" : "neutral"}>{asset.dataStatus === "live" ? "Güncel veri" : asset.dataStatus === "delayed" ? `${asset.delayMinutes ?? ""} dk gecikmeli`.trim() : "Kaynaklardan hesaplandı"}</Badge><strong>{formatPrice(asset.price, asset.currency)}</strong><ChangeIndicator value={asset.changePercent} /><a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer">{asset.sourceName}<ExternalLink className="inline-icon" aria-hidden="true" /></a></div>
          <div className="asset-hero-actions"><Button onClick={toggleFollow}>{following ? <BookmarkCheck className="inline-icon" aria-hidden="true" /> : <Bookmark className="inline-icon" aria-hidden="true" />}{following ? "Takipte" : "Takip listesine ekle"}</Button><ButtonLink href={`/alarmlar?symbol=${asset.symbol}`} variant="secondary"><Bell className="inline-icon" aria-hidden="true" />Alarm kur</ButtonLink></div>
        </div>
        <div className="asset-metrics">{metric("Gün içi yüksek", formatPrice(asset.high, asset.currency))}{metric("Gün içi düşük", formatPrice(asset.low, asset.currency))}{metric("Günlük değişim", formatPrice(asset.change, asset.currency))}{metric("İşlem hacmi", asset.volume ? compact.format(asset.volume) : "—")}{metric("Alınma zamanı", new Date(asset.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }))}</div>
      </PageContainer>
    </section>

    <section className="content-section">
      <PageContainer className="asset-layout">
        <div className="chart-card">
          <header><div><span className="eyebrow-label">OHLC MUM GRAFİĞİ</span><h2>{asset.symbol} görünümü</h2></div><Badge tone={chartType === "ohlc" ? "positive" : "warning"}>{chartType === "ohlc" ? "OHLC" : "Türetilmiş OHLC"}</Badge></header>
          <Tabs items={ranges} value={range} onChange={(value) => setRange(value as TimeRange)} label="Grafik zaman aralığı" />
          {history.length > 1 ? <PriceChart points={history} positive={asset.changePercent >= 0} storageKey={`piyascope.chart-drawings.${asset.symbol}`} /> : <EmptyState title="Grafik verisi alınamadı" description={historyError || "Kaynak bu dönem için yeterli tarihsel nokta döndürmedi."} />}
          <Disclaimer compact>{historyDescription}</Disclaimer>
        </div>
        <aside className="asset-fundamentals">
          <span className="eyebrow-label">TEMEL METRİKLER</span>
          {asset.assetType === "stock" && <>{metric("F/K", asset.peRatio?.toFixed(2) ?? "—")}{metric("PD/DD", asset.priceToBook?.toFixed(2) ?? "—")}{metric("Piyasa değeri", asset.marketCap ? compact.format(asset.marketCap) : "—")}{metric("Temettü verimi", asset.dividendYield ? `%${asset.dividendYield.toFixed(2)}` : "—")}{metric("Son bilanço", asset.latestFinancialPeriod ?? "—")}{metric("Sektör", asset.sector ?? "—")}</>}
          {asset.assetType === "crypto" && <>{metric("Piyasa değeri", asset.marketCap ? compact.format(asset.marketCap) : "—")}{metric("24 saat hacim", compact.format(asset.volume))}{metric("Dolaşımdaki arz", asset.circulatingSupply ? compact.format(asset.circulatingSupply) : "—")}{metric("24 saat değişim", `%${asset.changePercent.toFixed(2)}`)}</>}
          {["fx", "commodity", "index"].includes(asset.assetType) && <>{metric("Önceki kapanış", asset.previousClose ? formatPrice(asset.previousClose, asset.currency) : "—")}{metric("Birim", asset.unit ?? "Endeks değeri")}{metric("Günlük aralık", `${formatPrice(asset.low, asset.currency)} - ${formatPrice(asset.high, asset.currency)}`)}</>}
          <div className="related-symbols"><span>Benzer / ilgili</span>{asset.relatedSymbols?.map((item) => <Link href={`/varlik/${item}`} key={item}>{item} →</Link>) ?? <small>İlgili sembol bulunmuyor.</small>}</div>
        </aside>
      </PageContainer>
    </section>

    <section className="content-section alt">
      <PageContainer>
        <div className="ai-asset-panel">
          <div><span className="eyebrow-label"><Sparkles className="inline-icon" aria-hidden="true" /> KAYNAKLI PİYASA ÖZETİ</span><h2>{asset.symbol} için olası etki kanalları</h2><p>Güncel fiyat ve canlı haber akışından üretilir; kesin fiyat tahmini veya al-sat-tut emri içermez.</p></div>
          {analysis ? <div className="ai-asset-answer"><p>{analysis.answer}</p><div>{analysis.sources.map((source) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.name} ↗</a>)}</div><Disclaimer compact /></div> : <div>{analysisError && <p role="alert">{analysisError}</p>}<Button onClick={() => void runAnalysis()} disabled={analyzing}>{analyzing ? "Analiz hazırlanıyor..." : "Kaynaklı özeti oluştur"}</Button></div>}
        </div>
      </PageContainer>
    </section>

    <section className="content-section">
      <PageContainer><h2 className="related-heading">{asset.symbol} ile ilgili haberler</h2>{news.length ? <div className="news-grid">{news.map((article) => <NewsCard article={article} key={article.id} />)}</div> : <EmptyState title="İlgili haber bulunamadı" description="Yeni haberler geldiğinde burada otomatik olarak gösterilecek." />}</PageContainer>
    </section>
  </>;
}
