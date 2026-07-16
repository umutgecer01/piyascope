"use client";

import { useEffect, useState, type FormEvent } from "react";
import { marketCatalog } from "../lib/data/catalog";
import { alertService } from "../lib/services/alertService";
import { marketService } from "../lib/services/marketService";
import type { AlertCondition, MarketAsset, PriceAlert } from "../lib/types";
import { useToast } from "./Providers";
import { formatPrice } from "./ui/cards";
import { Badge, Button, Disclaimer, EmptyState, Input, PageContainer, SectionHeader } from "./ui/primitives";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [symbol, setSymbol] = useState("GAUTRY");
  const [condition, setCondition] = useState<AlertCondition>("above");
  const [target, setTarget] = useState("5000");
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [dataError, setDataError] = useState("");
  const { push } = useToast();
  useEffect(() => {
    const initial = new URLSearchParams(location.search).get("symbol")?.toUpperCase();
    queueMicrotask(() => { setAlerts(alertService.list()); if (initial && marketCatalog.some((asset) => asset.symbol === initial)) setSymbol(initial); });
    const load = () => { void marketService.getSnapshot().then((result) => { setAssets(result.data); setDataError(result.error ?? ""); }); };
    load(); const timer = window.setInterval(load, 60_000); return () => window.clearInterval(timer);
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault(); const value = Number(target.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { push("Geçerli bir hedef fiyat gir.", "error"); return; }
    setAlerts(alertService.add(symbol, condition, value)); push("Fiyat alarmı oluşturuldu.", "success");
  };
  return <>
    <section className="page-title-band"><PageContainer className="title-row"><div><span className="eyebrow-label">FİYAT TAKİBİ</span><h1>Alarmlar</h1></div><p>Hedef fiyat koşullarını bu cihazda sakla. İlk aşamada gerçek push bildirimi gönderilmez.</p></PageContainer></section>
    <section className="content-section"><PageContainer className="alerts-layout">
      <div className="alert-form-card"><SectionHeader eyebrow="YENİ ALARM" title="Bir fiyat koşulu belirle" /><form onSubmit={submit}><label><span>Varlık</span><select className="ui-select" value={symbol} onChange={(event) => setSymbol(event.target.value)}>{marketCatalog.map((asset) => <option value={asset.symbol} key={asset.symbol}>{asset.symbol} · {asset.name}</option>)}</select></label><label><span>Koşul</span><select className="ui-select" value={condition} onChange={(event) => setCondition(event.target.value as AlertCondition)}><option value="above">Fiyatın üstüne çıkınca</option><option value="below">Fiyatın altına düşünce</option></select></label><label><span>Hedef fiyat</span><Input inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} aria-label="Hedef fiyat" /></label><div className="selected-price"><span>Alınan son fiyat</span><b>{assets.find((asset) => asset.symbol === symbol) ? formatPrice(assets.find((asset) => asset.symbol === symbol)!.price, assets.find((asset) => asset.symbol === symbol)!.currency) : "Veri bekleniyor"}</b></div><Button type="submit">Alarmı oluştur</Button></form><Disclaimer compact>Fiyatlar sayfa açıkken 60 saniyede bir güncellenir. Tarayıcı kapalıyken kontrol ve push bildirimi yapılmaz.</Disclaimer></div>
      <div><SectionHeader eyebrow="ALARM LİSTESİ" title={`${alerts.length} alarm`} action={<Badge tone={dataError ? "warning" : "positive"}>{dataError ? "Kısmi fiyat akışı" : "Güncel fiyat kontrolü"}</Badge>} />{alerts.length ? <div className="alert-list">{alerts.map((alert) => { const asset = assets.find((item) => item.symbol === alert.assetSymbol); const reached = asset ? alert.condition === "above" ? asset.price >= alert.targetPrice : asset.price <= alert.targetPrice : false; return <article className={alert.isActive ? "active" : "inactive"} key={alert.id}><header><div><b>{alert.assetSymbol}</b><span>{asset?.name ?? "Fiyat bekleniyor"}</span></div><Badge tone={reached ? "positive" : alert.isActive ? "accent" : "neutral"}>{reached ? "Koşul sağlandı" : alert.isActive ? "Aktif" : "Pasif"}</Badge></header><p>{alert.condition === "above" ? "Üstüne çıktığında" : "Altına düştüğünde"} <strong>{formatPrice(alert.targetPrice, asset?.currency ?? "TRY")}</strong></p><small>Alınan son fiyat: {asset ? formatPrice(asset.price, asset.currency) : "—"}</small><footer><Button size="sm" variant="ghost" onClick={() => setAlerts(alertService.toggle(alert.id))}>{alert.isActive ? "Pasif yap" : "Aktif yap"}</Button><Button size="sm" variant="danger" onClick={() => { setAlerts(alertService.remove(alert.id)); push("Alarm silindi.", "info"); }}>Sil</Button></footer></article>; })}</div> : <EmptyState title="Henüz alarm yok" description="Gram altın, Bitcoin veya bir hisse için hedef fiyat belirleyebilirsin." />}</div>
    </PageContainer></section>
  </>;
}
