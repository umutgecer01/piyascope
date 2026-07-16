"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { newsService } from "../lib/services/newsService";
import { searchService } from "../lib/services/searchService";
import type { NewsArticle, SearchResult, SiteLocale } from "../lib/types";
import { EmptyState, Input } from "./ui/primitives";

const typeLabels: Record<SearchResult["type"], string> = { asset: "Varlık", news: "Haber", category: "Kategori", page: "Sayfa" };

export default function GlobalSearch({ open, onClose, locale }: { open: boolean; onClose(): void; locale: SiteLocale }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => searchService.getRecent());
  const results = useMemo(() => searchService.search(query, news, locale), [query, news, locale]);

  useEffect(() => {
    if (!open) return;
    void newsService.getNews(locale).then((result) => setNews(result.data));
  }, [open, locale]);

  const choose = useCallback((item: SearchResult) => {
    searchService.saveRecent(query || item.title);
    setRecent(searchService.getRecent());
    router.push(item.href);
    onClose();
    setQuery("");
  }, [onClose, query, router]);

  if (!open) return null;
  return <div className="search-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="global-search-panel" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
      <header><div><span className="eyebrow-label">GLOBAL ARAMA</span><h2 id="global-search-title">Varlık, haber veya kategori ara</h2></div><button type="button" onClick={onClose} aria-label="Aramayı kapat">×</button></header>
      <label className="global-search-input"><span aria-hidden="true">⌕</span><span className="sr-only">Arama metni</span><Input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
        if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex]); }
        if (event.key === "Escape") onClose();
      }} placeholder="THYAO, USD/TRY, Bitcoin veya haber başlığı…" /></label>
      {!query && <div className="recent-searches"><span>Son aramalar</span>{recent.length ? recent.map((item) => <button type="button" onClick={() => setQuery(item)} key={item}>↺ {item}</button>) : <small>Henüz arama geçmişi yok.</small>}</div>}
      {query && results.length > 0 && <div className="search-results" role="listbox" aria-label="Arama sonuçları">{results.map((item, index) => <button type="button" role="option" aria-selected={activeIndex === index} className={activeIndex === index ? "active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item)} key={item.id}><span className="result-icon">{item.type === "asset" ? "◈" : item.type === "news" ? "▤" : item.type === "category" ? "#" : "↗"}</span><span><b>{item.title}</b><small>{item.subtitle}</small></span><em>{typeLabels[item.type]}</em></button>)}</div>}
      {query && !results.length && <EmptyState title="Sonuç bulunamadı" description="Farklı bir sembol, başlık veya kategori deneyebilirsin." />}
      <footer><span>↑↓ seçim</span><span>Enter aç</span><span>Esc kapat</span></footer>
    </section>
  </div>;
}
