"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { aiService } from "../lib/services/aiService";
import type { AIAnalysis } from "../lib/types";
import { useToast } from "./Providers";
import { Badge, Button, Disclaimer, PageContainer } from "./ui/primitives";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; analysis?: AIAnalysis };
const examples = ["THYAO neden düştü?", "Bugün dolar neden yükseldi?", "TCMB faiz kararı borsayı nasıl etkileyebilir?", "Bugün piyasada öne çıkan gelişmeler neler?"];

export default function AIAnalystPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();

  useEffect(() => {
    const initial = new URLSearchParams(location.search).get("question");
    if (initial) queueMicrotask(() => setQuestion(initial));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  const ask = async (text: string) => {
    const clean = text.trim();
    if (clean.length < 3 || loading) return;
    setMessages((items) => [...items, { id: `u-${Date.now()}`, role: "user", text: clean }]);
    setQuestion(""); setLoading(true); setError("");
    try {
      const symbol = ["THYAO", "ASELS", "TUPRS", "BTC", "ETH", "USDTRY", "GAUTRY"].find((item) => clean.toUpperCase().replace("/", "").includes(item));
      const result = await aiService.analyze({ question: clean, assetSymbol: symbol });
      setMessages((items) => [...items, { id: result.id, role: "assistant", text: result.answer, analysis: result }]);
    } catch {
      setError("Analiz hazırlanamadı. Lütfen tekrar dene.");
    } finally { setLoading(false); }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(question); };
  return <section className="ai-page"><PageContainer>
    <header className="ai-page-header"><div><span className="eyebrow-label">✦ GÜNCEL KAYNAK SENTEZİ</span><h1>AI Analist</h1><p>Canlı piyasa ve haber kaynaklarını aynı zaman damgasıyla incele. Kesin tahmin, fiyat hedefi veya al-sat-tut emri üretilmez.</p></div><div><Badge tone="positive">Kaynaklı analiz</Badge><Button variant="ghost" onClick={() => { setMessages([]); setError(""); }}>+ Yeni sohbet</Button></div></header>
    <div className="ai-chat-shell"><aside className="ai-examples"><span>Örnek sorular</span>{examples.map((example) => <button type="button" onClick={() => void ask(example)} key={example}>{example}<i>→</i></button>)}<div className="ai-safety-list"><b>Güvenlik çerçevesi</b><span>✓ Kaynak olmadan kesin bilgi yok</span><span>✓ Fiyat hedefi yok</span><span>✓ Al, sat veya tut emri yok</span><span>✓ Tarih ve saat görünür</span></div></aside>
      <main className="chat-main"><div className="chat-history" aria-live="polite">{!messages.length && <div className="chat-empty"><span>✦</span><h2>Piyasayı birlikte anlamlandıralım.</h2><p>Bir varlık, haber veya makro gelişme hakkında soru sor. Yanıt yalnızca o anda erişilebilen fiyat ve haber kaynaklarından hazırlanır; kaynak yoksa analiz üretilmez.</p></div>}{messages.map((message) => <article className={`chat-message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === "user" ? "S" : "P"}</div><div><span>{message.role === "user" ? "Sen" : "Piyascope Analist"}{message.analysis && <Badge tone="positive">Kaynak sentezi</Badge>}</span><p>{message.text}</p>{message.analysis && <><div className="message-meta"><span>Güven: {message.analysis.confidence === "high" ? "Yüksek" : message.analysis.confidence === "medium" ? "Orta" : "Düşük"}</span><time>{new Date(message.analysis.createdAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "Europe/Istanbul" })}</time></div><div className="message-sources"><b>Kaynaklar</b>{message.analysis.sources.map((source) => <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>{source.name} ↗</a>)}</div><div className="message-assets"><b>İlgili varlıklar</b>{message.analysis.relatedAssets.map((symbol) => <Link href={`/varlik/${symbol}`} key={symbol}>{symbol}</Link>)}</div><div className="message-actions"><Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(message.text); push("Yanıt kopyalandı.", "success"); }}>Kopyala</Button></div><Disclaimer compact>{message.analysis.disclaimer}</Disclaimer></>}</div></article>)}{loading && <article className="chat-message assistant"><div className="message-avatar">P</div><div><span>Piyascope Analist</span><div className="typing-indicator" aria-label="Yanıt hazırlanıyor"><i /><i /><i /></div></div></article>}{error && <div className="chat-error" role="alert">{error}<Button size="sm" variant="ghost" onClick={() => setError("")}>Kapat</Button></div>}<div ref={endRef} /></div>
        <form className="chat-composer" onSubmit={submit}><label htmlFor="ai-question" className="sr-only">AI Analiste sorun</label><textarea id="ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question); } }} placeholder="Örn. Bugün dolar neden yükseldi?" rows={2} maxLength={600} /><button type="submit" disabled={loading || question.trim().length < 3} aria-label="Soruyu gönder">Gönder ↑</button><small>Her sayısal değer zaman damgası ve kaynakla sunulur; BIST verileri gecikmeli olabilir.</small></form>
      </main></div>
    <Disclaimer />
  </PageContainer></section>;
}
