"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { marketCatalog } from "../lib/data/catalog";
import { marketService } from "../lib/services/marketService";
import { newsService } from "../lib/services/newsService";
import { watchlistService } from "../lib/services/watchlistService";
import type { MarketAsset, NewsArticle, WatchlistItem } from "../lib/types";
import { useToast } from "./Providers";
import { ChangeIndicator, formatPrice, NewsCard } from "./ui/cards";
import { Badge, Button, ButtonLink, EmptyState, PageContainer, SectionHeader } from "./ui/primitives";

const categories = ["Borsa", "Döviz", "Altın", "Kripto", "Türkiye Ekonomisi", "Dünya Ekonomisi", "Teknoloji"];

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [selected, setSelected] = useState("THYAO");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [dragged, setDragged] = useState<string | null>(null);
  const { push } = useToast();
  useEffect(() => { queueMicrotask(() => setItems(watchlistService.list())); void Promise.all([newsService.getNews("tr"), marketService.getSnapshot()]).then(([feed, market]) => { setNews(feed.data); setAssets(market.data); }); }, []);
  const assetItems = items.flatMap((item) => item.assetSymbol ? [item] : []);
  const categoryItems = items.flatMap((item) => item.category ? [item] : []);
  const relatedNews = useMemo(() => news.filter((article) => article.relatedAssets.some((symbol) => assetItems.some((item) => item.assetSymbol === symbol)) || categoryItems.some((item) => item.category === article.category)).slice(0, 6), [news, assetItems, categoryItems]);

  const add = () => { const next = watchlistService.addAsset(selected); setItems(next); push(`${selected} takip listesine eklendi.`, "success"); };
  const remove = (id: string) => { setItems(watchlistService.remove(id)); push("Takip öğesi kaldırıldı.", "info"); };
  const move = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === id); const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; setItems(watchlistService.replace(next));
  };
  const drop = (targetId: string) => {
    if (!dragged || dragged === targetId) return;
    const source = items.find((item) => item.id === dragged); const targetIndex = items.findIndex((item) => item.id === targetId);
    if (!source || targetIndex < 0) return;
    const next = items.filter((item) => item.id !== dragged); next.splice(targetIndex, 0, source); setItems(watchlistService.replace(next)); setDragged(null);
  };
  return <>
    <section className="page-title-band"><PageContainer className="title-row"><div><span className="eyebrow-label">KİŞİSEL ÇALIŞMA ALANI</span><h1>Takip Listem</h1></div><p>İlgilendiğin varlıkları ve haber kategorilerini bu cihazda sakla, sıralamasını kendin belirle.</p></PageContainer></section>
    <section className="content-section"><PageContainer>
      <SectionHeader eyebrow="VARLIKLAR" title="Takip ettiğin piyasalar" description="Liste yalnızca bu tarayıcıda localStorage içinde saklanır; daha sonra kullanıcı hesabına taşınabilecek servis yapısı hazırdır." action={<Badge tone="accent">Cihazda saklanır</Badge>} />
      <div className="watchlist-add"><label><span>Varlık seç</span><select className="ui-select" value={selected} onChange={(event) => setSelected(event.target.value)}>{marketCatalog.map((asset) => <option value={asset.symbol} key={asset.symbol}>{asset.symbol} · {asset.name}</option>)}</select></label><Button onClick={add} disabled={assetItems.some((item) => item.assetSymbol === selected)}>+ Takip listesine ekle</Button><ButtonLink href="/alarmlar" variant="secondary">Fiyat alarmı kur</ButtonLink></div>
      {assetItems.length ? <div className="watchlist-table" role="list" aria-label="Takip edilen varlıklar">{assetItems.map((item, index) => { const asset = assets.find((entry) => entry.symbol === item.assetSymbol); const catalog = marketCatalog.find((entry) => entry.symbol === item.assetSymbol); return <article role="listitem" draggable onDragStart={() => setDragged(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(item.id)} key={item.id}><span className="drag-handle" aria-label="Sürükleyerek sırala">⋮⋮</span><div><b>{item.assetSymbol}</b><small>{asset?.name ?? catalog?.name ?? "Varlık"}</small></div><strong>{asset ? formatPrice(asset.price, asset.currency) : "—"}</strong>{asset ? <ChangeIndicator value={asset.changePercent} /> : <span>Veri bekleniyor</span>}<Link href={`/varlik/${item.assetSymbol}`}>Detay →</Link><div className="reorder-actions"><button type="button" onClick={() => move(item.id, -1)} disabled={index === 0} aria-label={`${item.assetSymbol} yukarı taşı`}>↑</button><button type="button" onClick={() => move(item.id, 1)} disabled={index === assetItems.length - 1} aria-label={`${item.assetSymbol} aşağı taşı`}>↓</button><button type="button" onClick={() => remove(item.id)} aria-label={`${item.assetSymbol} takipten çıkar`}>×</button></div></article>; })}</div> : <EmptyState title="Takip listen boş" description="THYAO, dolar, gram altın veya Bitcoin gibi bir varlık ekleyerek başlayabilirsin." />}
    </PageContainer></section>
    <section className="content-section alt"><PageContainer>
      <SectionHeader eyebrow="KATEGORİLER" title="İlgilendiğin haber akışları" description="Kategori seçimi, takip listendeki ilgili son haberleri belirler." />
      <div className="category-picker">{categories.map((category) => { const item = categoryItems.find((entry) => entry.category === category); return <button type="button" className={item ? "active" : ""} onClick={() => setItems(item ? watchlistService.remove(item.id) : watchlistService.addCategory(category))} key={category}>{item ? "✓ " : "+ "}{category}</button>; })}</div>
    </PageContainer></section>
    <section className="content-section"><PageContainer><SectionHeader eyebrow="İLGİLİ AKIŞ" title="Takip listene göre son haberler" />{relatedNews.length ? <div className="news-grid">{relatedNews.map((article) => <NewsCard article={article} key={article.id} />)}</div> : <EmptyState title="İlgili haber yok" description="Varlık veya kategori eklediğinde ilgili haberler burada görünür." />}</PageContainer></section>
  </>;
}
