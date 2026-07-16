"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { aiService } from "../lib/services/aiService";
import { newsService } from "../lib/services/newsService";
import type { AIAnalysis, NewsArticle } from "../lib/types";
import { useToast } from "./Providers";
import { NewsCard } from "./ui/cards";
import { Badge, Button, ButtonLink, Disclaimer, EmptyState, ErrorState, PageContainer, Skeleton, Tabs } from "./ui/primitives";

const effectLabels = ["BIST etkisi", "Döviz etkisi", "Altın etkisi", "Kripto etkisi", "Etkilenebilecek sektörler", "Etkilenebilecek şirketler"];

export default function NewsDetailView({ slug }: { slug: string }) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [similar, setSimilar] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryLength, setSummaryLength] = useState("15 saniyede oku");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [saved, setSaved] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    void newsService.getNews("tr").then((result) => {
      const found = result.data.find((item) => item.slug === slug || item.id === slug) ?? null;
      setArticle(found);
      setSimilar(found ? result.data.filter((item) => item.id !== found.id && (item.category === found.category || item.relatedAssets.some((symbol) => found.relatedAssets.includes(symbol)))).slice(0, 3) : []);
      setError(result.error ?? "");
      setLoading(false);
      if (found) {
        try { setSaved((JSON.parse(localStorage.getItem("piyascope.saved-news.v1") ?? "[]") as string[]).includes(found.id)); } catch { setSaved(false); }
      }
    });
  }, [slug]);

  const runAnalysis = async () => {
    if (!article) return;
    setAnalyzing(true); setAnalysisError("");
    try { setAnalysis(await aiService.analyze({ question: `Bu haberin piyasa etkisini kaynaklara dayanarak analiz et: ${article.title}`, newsId: article.id, assetSymbol: article.relatedAssets[0] })); }
    catch (error) { setAnalysisError(error instanceof Error ? error.message : "Güncel analiz hazırlanamadı."); }
    finally { setAnalyzing(false); }
  };

  const toggleSaved = () => {
    if (!article) return;
    let items: string[] = [];
    try { items = JSON.parse(localStorage.getItem("piyascope.saved-news.v1") ?? "[]") as string[]; } catch {}
    const next = items.includes(article.id) ? items.filter((id) => id !== article.id) : [...items, article.id];
    localStorage.setItem("piyascope.saved-news.v1", JSON.stringify(next));
    setSaved(next.includes(article.id));
    push(next.includes(article.id) ? "Haber kaydedildi." : "Kayıt kaldırıldı.", "success");
  };

  if (loading) return <PageContainer className="detail-loading"><Skeleton className="detail-title-skeleton" /><Skeleton className="detail-body-skeleton" /></PageContainer>;
  if (!article) return <PageContainer className="detail-missing">{error ? <ErrorState description={error} /> : <EmptyState title="Haber bulunamadı" description="Bu bağlantı artık geçerli olmayabilir veya haber akıştan kaldırılmış olabilir." action={<ButtonLink href="/haberler">Haberlere dön</ButtonLink>} />}</PageContainer>;

  const published = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(article.publishedAt));
  const shortSummary = summaryLength === "15 saniyede oku" ? article.summary.split(".")[0] + "." : summaryLength === "Kısa özet" ? article.summary : article.content;
  const structuredData = { "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, datePublished: article.publishedAt, dateModified: article.updatedAt, publisher: { "@type": "Organization", name: "Piyascope" }, isAccessibleForFree: true, mainEntityOfPage: `${typeof location === "undefined" ? "" : location.origin}/haber/${article.slug}` };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <article className="news-detail"><PageContainer>
      <nav className="breadcrumbs" aria-label="Sayfa yolu"><Link href="/">Ana Sayfa</Link><span>/</span><Link href="/haberler">Haberler</Link><span>/</span><b>{article.category}</b></nav>
      <header className="article-header"><div className="news-meta"><Badge tone={article.impactLevel === "high" ? "negative" : "warning"}>{article.impactLevel === "high" ? "Yüksek etki" : "Orta etki"}</Badge><span>{article.category}</span><Badge tone={article.confidence === "A1" ? "positive" : "neutral"}>{article.confidence === "A1" ? "Birincil kaynak" : "Canlı haber akışı"}</Badge></div><h1>{article.title}</h1><p>{article.summary}</p><div className="article-byline"><b>{article.source}</b><time dateTime={article.publishedAt}>{published}</time><span>Güncelleme {new Date(article.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</span><span>{article.readingTime} dk okuma</span></div><div className="article-actions"><Button onClick={toggleSaved} variant={saved ? "secondary" : "ghost"}>{saved ? "◆ Kaydedildi" : "◇ Kaydet"}</Button><Button variant="ghost" onClick={async () => { const url = location.href; if (navigator.share) await navigator.share({ title: article.title, url }).catch(() => {}); else { await navigator.clipboard.writeText(url); push("Bağlantı kopyalandı.", "success"); } }}>↗ Paylaş</Button><a className="ui-button button-secondary button-md" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Kaynağa git ↗</a></div></header>
      <div className="article-visual news-visual" role="img" aria-label={`${article.category} için soyut finans görseli`}><span>{article.relatedAssets.join(" · ")}</span></div>
      <div className="article-layout"><div className="article-content"><p className="lead-paragraph">{article.summary}</p><p>{article.content}</p><h2>Neden önemli?</h2><p>Bu gelişmenin önemi, beklenti ile gerçekleşme arasındaki farka ve ilgili varlıklardaki mevcut pozisyonlanmaya göre değişebilir. Tek başına bir başlık kesin bir fiyat yönü göstermez.</p><div className="article-assets"><span>İlgili varlıklar</span>{article.relatedAssets.map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol} →</Link>)}</div><Disclaimer /></div>
        <aside className="article-aside"><section className="ai-summary-box"><div><span className="eyebrow-label">✦ KAYNAK ÖZETİ</span><Badge tone="positive">Canlı akış</Badge></div><Tabs items={["15 saniyede oku", "Kısa özet", "Detaylı özet"]} value={summaryLength} onChange={setSummaryLength} label="Özet uzunluğu" /><p>{shortSummary}</p><Disclaimer compact /></section><section className="ai-impact-box"><span className="eyebrow-label">KAYNAKLI ETKİ ANALİZİ</span>{analysis ? <><div className="effect-grid">{effectLabels.map((label, index) => <div key={label}><span>{label}</span><p>{index < 4 ? "Yön ve büyüklük, güncel fiyatlama ile haberin özgün ayrıntılarına bağlıdır." : article.relatedAssets.join(", ") || "Doğrudan eşleşme yok"}</p></div>)}</div><p className="analysis-reason"><b>Kısa gerekçe:</b> {analysis.answer}</p><div className="confidence-row"><span>Güven seviyesi</span><Badge tone="warning">{analysis.confidence === "high" ? "Yüksek" : analysis.confidence === "medium" ? "Orta" : "Düşük"}</Badge></div><div className="source-list">{analysis.sources.map((source) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.name} ↗</a>)}</div></> : <><p>Haberin BIST, döviz, altın ve kripto üzerindeki olası etki kanallarını güncel fiyat ve haber kaynaklarıyla incele.</p>{analysisError && <p role="alert">{analysisError}</p>}<Button onClick={() => void runAnalysis()} disabled={analyzing}>{analyzing ? "Analiz hazırlanıyor…" : "✦ Etki analizini oluştur"}</Button></>}</section></aside></div>
    </PageContainer></article>
    {similar.length > 0 && <section className="content-section alt"><PageContainer><h2 className="related-heading">Benzer haberler</h2><div className="news-grid">{similar.map((item) => <NewsCard article={item} key={item.id} />)}</div></PageContainer></section>}
  </>;
}
