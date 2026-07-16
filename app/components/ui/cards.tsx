"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, BookmarkCheck, ExternalLink, Share2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { MarketAsset, NewsArticle } from "../../lib/types";
import { Badge, Button, ButtonLink } from "./primitives";

const compactNumber = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

export function formatPrice(value: number, currency: string) {
  const digits = value < 10 ? 4 : value < 1000 ? 2 : 0;
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) + (currency === "TRY" ? " ₺" : currency === "USD" ? " $" : ` ${currency}`);
}

export function ChangeIndicator({ value, compact = false }: { value: number; compact?: boolean }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return <span className={`change-indicator ${positive ? "positive" : "negative"}`} aria-label={`${positive ? "Yükseliş" : "Düşüş"} yüzde ${Math.abs(value).toFixed(2)}`}><Icon className="inline-icon" aria-hidden="true" />{compact ? "" : positive ? "Yükseliş" : "Düşüş"} %{Math.abs(value).toFixed(2)}</span>;
}

export function MarketCard({ asset, compact = false, action }: { asset: MarketAsset; compact?: boolean; action?: ReactNode }) {
  return <article className={`market-card ${compact ? "compact" : ""}`}>
    <header><div><span className="asset-symbol">{asset.symbol}</span><p>{asset.name}</p></div><Badge tone={asset.dataStatus === "live" ? "positive" : asset.dataStatus === "delayed" ? "warning" : "neutral"}>{asset.dataStatus === "live" ? "Güncel" : asset.dataStatus === "delayed" ? `${asset.delayMinutes ?? ""} dk gecikmeli`.trim() : asset.dataStatus === "derived" ? "Hesaplanan" : "Referans"}</Badge></header>
    <strong>{formatPrice(asset.price, asset.currency)}</strong>
    <ChangeIndicator value={asset.changePercent} compact={compact} />
    {!compact && <footer><span title={`${asset.sourceName}${asset.delayMinutes ? ` · ${asset.delayMinutes} dk gecikmeli` : ""}`}>{asset.sourceName} · Hacim {asset.volume ? compactNumber.format(asset.volume) : "—"}</span>{action ?? <Link href={`/varlik/${asset.symbol}`}>Detay <ArrowRight className="inline-icon" aria-hidden="true" /></Link>}</footer>}
  </article>;
}

function categoryVisual(category: string) {
  const normalized = category.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR");
  if (/borsa|stock|piyasa/.test(normalized)) return "borsa";
  if (/doviz|fx|kur|currency/.test(normalized)) return "doviz";
  if (/altin|gold/.test(normalized)) return "altin";
  if (/kripto|crypto|bitcoin|ethereum/.test(normalized)) return "kripto";
  if (/enerji|energy|petrol|oil/.test(normalized)) return "enerji";
  if (/teknoloji|technology|ai/.test(normalized)) return "teknoloji";
  return "default";
}

export function NewsCard({ article, featured = false, onSave, saved = false, onShare }: { article: NewsArticle; featured?: boolean; onSave?(): void; saved?: boolean; onShare?(): void }) {
  const published = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(article.publishedAt));
  return <article className={`news-card ${featured ? "featured" : ""}`}>
    <div className={`news-visual visual-${categoryVisual(article.category)}`} role="img" aria-label={`${article.category} için soyut finans görseli`}><span>{article.relatedAssets[0] ?? "P"}</span><i aria-hidden="true" /></div>
    <div className="news-card-body">
      <div className="news-meta"><Badge tone={article.impactLevel === "high" ? "negative" : article.impactLevel === "medium" ? "warning" : "neutral"}>{article.impactLevel === "high" ? "Yüksek etki" : article.impactLevel === "medium" ? "Orta etki" : "Düşük etki"}</Badge><span>{article.category}</span><Badge tone={article.confidence === "A1" ? "positive" : "neutral"}>{article.confidence === "A1" ? "Birincil kaynak" : "Haber akışı"}</Badge></div>
      <h3><Link href={`/haber/${article.slug}`}>{article.title}</Link></h3>
      <p>{article.summary}</p>
      <div className="news-source"><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"><b>{article.source}</b><ExternalLink className="inline-icon" aria-hidden="true" /></a>{article.sourceDomain && <span>{article.sourceDomain}</span>}<time dateTime={article.publishedAt}>{published}</time><span>{article.readingTime} dk okuma</span></div>
      <div className="asset-chips">{article.relatedAssets.map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol}</Link>)}</div>
      <div className="news-actions">
        {onSave && <Button variant="ghost" size="sm" onClick={onSave} aria-label={saved ? "Haberi kayıtlardan çıkar" : "Haberi kaydet"}>{saved ? <BookmarkCheck className="inline-icon" aria-hidden="true" /> : <Bookmark className="inline-icon" aria-hidden="true" />}{saved ? "Kaydedildi" : "Kaydet"}</Button>}
        {onShare && <Button variant="ghost" size="sm" onClick={onShare}><Share2 className="inline-icon" aria-hidden="true" />Paylaş</Button>}
        <ButtonLink href={`/haber/${article.slug}`} variant="secondary"><ArrowRight className="inline-icon" aria-hidden="true" />Detaya git</ButtonLink>
      </div>
      <div className="ai-quick-actions"><Link href={`/ai-analist?newsId=${encodeURIComponent(article.id)}&question=${encodeURIComponent("Bu haberi özetle: " + article.title)}`}><Sparkles className="inline-icon" aria-hidden="true" />AI ile özetle</Link><Link href={`/ai-analist?newsId=${encodeURIComponent(article.id)}&question=${encodeURIComponent("Bu haberin piyasa etkisini analiz et: " + article.title)}`}>Etki analizi <ArrowRight className="inline-icon" aria-hidden="true" /></Link></div>
    </div>
  </article>;
}

export function AnalysisCard({ title, value, description, tone = "neutral", children }: { title: string; value?: string; description?: string; tone?: "neutral" | "positive" | "negative" | "accent"; children?: ReactNode }) {
  return <article className={`analysis-card analysis-${tone}`}><span>{title}</span>{value && <strong>{value}</strong>}{description && <p>{description}</p>}{children}</article>;
}
