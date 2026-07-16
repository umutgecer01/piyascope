"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, ListFilter, RefreshCw, Search, Star, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { marketService } from "../lib/services/marketService";
import { watchlistService } from "../lib/services/watchlistService";
import type { AssetType, MarketAsset, SiteLocale } from "../lib/types";
import { useToast } from "./Providers";
import { ChangeIndicator, formatPrice, MarketCard } from "./ui/cards";
import { Badge, Button, ErrorState, Input, PageContainer, SectionHeader, Skeleton, Tabs } from "./ui/primitives";

const typeLabels: Record<AssetType, string> = { stock: "Hisse", index: "Endeks", fx: "Döviz", commodity: "Emtia", crypto: "Kripto" };
const tabs = ["Tümü", "Endeks", "Hisse", "Döviz", "Emtia", "Kripto"];
const sortOptions = [
  ["marketCap", "Piyasa değeri"],
  ["changeDesc", "En çok yükselen"],
  ["changeAsc", "En çok düşen"],
  ["volume", "Hacim"],
  ["symbol", "Sembol"],
] as const;
type SortMode = typeof sortOptions[number][0];

const compact = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR").trim();
}

function matchesQuery(asset: MarketAsset, query: string) {
  if (!query) return true;
  const haystack = normalizeSearch(`${asset.symbol} ${asset.name} ${asset.sector ?? ""} ${asset.currency} ${typeLabels[asset.assetType]}`);
  return haystack.includes(query);
}

function sortAssets(assets: MarketAsset[], mode: SortMode) {
  return [...assets].sort((a, b) => {
    if (mode === "changeDesc") return b.changePercent - a.changePercent;
    if (mode === "changeAsc") return a.changePercent - b.changePercent;
    if (mode === "volume") return b.volume - a.volume;
    if (mode === "symbol") return a.symbol.localeCompare(b.symbol);
    return (b.marketCap ?? 0) - (a.marketCap ?? 0) || b.volume - a.volume || a.symbol.localeCompare(b.symbol);
  });
}

export default function MarketsDashboard({ locale = "tr" }: { locale?: SiteLocale }) {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("marketCap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(() => watchlistService.list().flatMap((item) => item.assetSymbol ? [item.assetSymbol] : []));
  const { push } = useToast();

  const applyData = (result: Awaited<ReturnType<typeof marketService.getSnapshot>>) => {
    setAssets(result.data);
    setTotal(result.total ?? result.data.length);
    setError(result.error ?? "");
    setLoading(false);
  };

  const load = () => {
    setLoading(true);
    void marketService.getSnapshot().then(applyData);
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void marketService.getSnapshot().then(applyData);
    });
    return () => { cancelled = true; };
  }, []);

  const normalizedQuery = normalizeSearch(query);
  const visible = useMemo(() => sortAssets(assets.filter((asset) => (type === "Tümü" || typeLabels[asset.assetType] === type) && matchesQuery(asset, normalizedQuery)), sortMode), [assets, normalizedQuery, sortMode, type]);
  const strongest = useMemo(() => [...assets].sort((a, b) => b.changePercent - a.changePercent)[0], [assets]);
  const weakest = useMemo(() => [...assets].sort((a, b) => a.changePercent - b.changePercent)[0], [assets]);
  const topVolume = useMemo(() => [...assets].sort((a, b) => b.volume - a.volume)[0], [assets]);
  const cardAssets = visible.slice(0, 24);

  const toggle = (symbol: string) => {
    const item = watchlistService.list().find((entry) => entry.assetSymbol === symbol);
    const next = item ? watchlistService.remove(item.id) : watchlistService.addAsset(symbol);
    setWatchlist(next.flatMap((entry) => entry.assetSymbol ? [entry.assetSymbol] : []));
    push(item ? `${symbol} takip listesinden çıkarıldı.` : `${symbol} takip listesine eklendi.`, "success");
  };

  return <>
    <section className="page-title-band">
      <PageContainer className="title-row">
        <div><span className="eyebrow-label">PİYASA MASASI</span><h1>{locale === "en" ? "Search the market, then open the chart." : "Piyasayı ara, grafiği aç."}</h1></div>
        <p>{locale === "en" ? "A wider TradingView-backed market universe with instant filtering, watchlist actions and source links." : "TradingView scanner kaynaklı geniş piyasa evreninde anlık arama, takip listesi ve kaynak bağlantıları."}</p>
      </PageContainer>
    </section>

    <section className="content-section">
      <PageContainer>
        <div className="market-overview-grid">
          <article><span>GÜNÜN EN GÜÇLÜSÜ</span><strong>{strongest?.symbol ?? "—"}</strong>{strongest && <ChangeIndicator value={strongest.changePercent} />}</article>
          <article><span>GÜNÜN EN ZAYIFI</span><strong>{weakest?.symbol ?? "—"}</strong>{weakest && <ChangeIndicator value={weakest.changePercent} />}</article>
          <article><span>EN YÜKSEK HACİM</span><strong>{topVolume?.symbol ?? "—"}</strong><p>{topVolume ? compact.format(topVolume.volume) : "Veri bekleniyor"}</p></article>
          <article><span>GÖRÜNEN EVREN</span><strong>{loading ? "—" : total || assets.length}</strong><p>{error ? "Kısmi akış" : "TradingView scanner + ek kaynaklar"}</p></article>
        </div>
      </PageContainer>
    </section>

    <section className="content-section alt">
      <PageContainer>
        <SectionHeader
          eyebrow="PİYASA LİSTESİ"
          title="Tüm varlıkları ara ve karşılaştır"
          description="Sembol, şirket adı, sektör, döviz veya varlık sınıfı yaz; sonuçlar tablo ve kartlarda anında filtrelenir."
          action={<Badge tone={error ? "warning" : "positive"}>{error ? "Kısmi canlı akış" : `${assets.length} varlık yüklendi`}</Badge>}
        />
        <div className="market-command-bar">
          <label className="market-search-box">
            <Search className="inline-icon" aria-hidden="true" />
            <span className="sr-only">Piyasa ara</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="THYAO, banka, USDTRY, bitcoin, altın..." autoComplete="off" />
          </label>
          <label className="market-sort">
            <ListFilter className="inline-icon" aria-hidden="true" />
            <span>Sırala</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Piyasa sıralaması">
              {sortOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw className="inline-icon" aria-hidden="true" />Yenile</Button>
        </div>
        <div className="market-filter-row">
          <Tabs items={tabs} value={type} onChange={setType} label="Varlık türleri" />
          <span><Table2 className="inline-icon" aria-hidden="true" />{visible.length} sonuç</span>
        </div>

        {loading ? <div className="market-grid markets-page-grid">{Array.from({ length: 12 }, (_, index) => <Skeleton className="market-card" key={index} />)}</div> : error && !assets.length ? <ErrorState description={error} onRetry={load} /> : <>
          <div className="market-grid markets-page-grid">
            {cardAssets.map((asset) => <MarketCard asset={asset} key={asset.symbol} action={<button className="watch-action" type="button" onClick={() => toggle(asset.symbol)}><Star className="inline-icon" aria-hidden="true" />{watchlist.includes(asset.symbol) ? "Takipte" : "Takip et"}</button>} />)}
          </div>
          {visible.length > cardAssets.length && <p className="market-list-note">Kartlarda ilk {cardAssets.length} sonuç gösteriliyor; tablo tüm {visible.length} sonucu içeriyor.</p>}
          <div className="market-table-wrap">
            <table className="market-table">
              <caption className="sr-only">Piyasa varlıklarının detaylı karşılaştırması</caption>
              <thead><tr><th>Varlık</th><th>Tür</th><th>Fiyat</th><th>Değişim</th><th>Yüksek</th><th>Düşük</th><th>Hacim</th><th>Kaynak</th><th /></tr></thead>
              <tbody>{visible.map((asset) => <tr key={asset.symbol}>
                <td><b>{asset.symbol}</b><span>{asset.name}</span></td>
                <td>{typeLabels[asset.assetType]}</td>
                <td>{formatPrice(asset.price, asset.currency)}</td>
                <td><ChangeIndicator value={asset.changePercent} compact /></td>
                <td>{formatPrice(asset.high, asset.currency)}</td>
                <td>{formatPrice(asset.low, asset.currency)}</td>
                <td>{asset.volume ? compact.format(asset.volume) : "—"}</td>
                <td><a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer">{asset.sourceName}<ExternalLink className="inline-icon" aria-hidden="true" /></a></td>
                <td><Link href={`/varlik/${asset.symbol}`}>Grafik<ArrowRight className="inline-icon" aria-hidden="true" /></Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
        {error && assets.length > 0 && <p className="section-warning">{error}</p>}
      </PageContainer>
    </section>
  </>;
}
