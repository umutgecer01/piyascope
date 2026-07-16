"use client";

import { useEffect, useState } from "react";
import { marketService } from "../lib/services/marketService";
import type { MarketAsset } from "../lib/types";
import { formatPrice } from "./ui/cards";
import { Badge, Skeleton } from "./ui/primitives";

export default function MarketTicker() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const refresh = () => { void marketService.getSnapshot().then((result) => { setAssets(result.data.slice(0, 7)); setError(result.error ?? ""); setLoaded(true); }); };
    refresh();
    const interval = window.setInterval(refresh, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return <section className="market-ticker-pro" aria-label="Canlı piyasa şeridi">
    <div className="ticker-label"><span className="live-pulse" /><b>Piyasa</b><Badge tone={error ? "warning" : "positive"}>{error ? "Kısmi akış" : "Güncel akış"}</Badge></div>
    <div className="ticker-scroll" tabIndex={0} aria-label="Piyasa değerlerini yatay kaydır">
      {assets.length ? assets.map((asset) => {
        const positive = asset.changePercent >= 0;
        return <a href={`/varlik/${asset.symbol}`} className="ticker-item" key={asset.symbol}>
          <span><b>{asset.symbol}</b><small>{asset.name}</small></span>
          <strong>{formatPrice(asset.price, asset.currency)}</strong>
          <em className={positive ? "positive" : "negative"} aria-label={positive ? "Yükseliş" : "Düşüş"}>{positive ? "↗" : "↘"} %{Math.abs(asset.changePercent).toFixed(2)}</em>
          <time dateTime={asset.updatedAt} title={`${asset.sourceName}${asset.delayMinutes ? ` · ${asset.delayMinutes} dk gecikmeli` : ""}`}>{new Date(asset.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</time>
        </a>;
      }) : loaded ? <div className="ticker-item"><span><b>Veri alınamadı</b><small>Daha sonra yeniden dene</small></span></div> : Array.from({ length: 5 }, (_, index) => <div className="ticker-item" key={index}><Skeleton className="ticker-skeleton" /></div>)}
    </div>
  </section>;
}
