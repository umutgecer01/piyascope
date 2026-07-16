"use client";

import { useEffect, useMemo, useState } from "react";
import { calendarService } from "../lib/services/calendarService";
import type { EconomicEvent } from "../lib/types";
import { Badge, Disclaimer, EmptyState, ErrorState, PageContainer, SectionHeader, Skeleton, Tabs } from "./ui/primitives";

const filters = ["Tümü", "Bugün", "Bu hafta", "Türkiye", "ABD", "Avrupa", "Yüksek etkili"];
const countryNames: Record<EconomicEvent["country"], string> = { TR: "Türkiye", US: "ABD", EU: "Avrupa", GB: "Birleşik Krallık", CN: "Çin", GLOBAL: "Küresel" };

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [filter, setFilter] = useState("Tümü");
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const applyData = (result: Awaited<ReturnType<typeof calendarService.getEvents>>) => {
    setEvents(result.data);
    setError(result.error ?? "");
    setLoading(false);
  };
  const load = () => {
    setLoading(true);
    setError("");
    void calendarService.getEvents().then(applyData);
  };
  useEffect(() => {
    void calendarService.getEvents().then(applyData);
  }, []);
  const visible = useMemo(() => events.filter((event) => {
    if (filter === "Bugün") return event.date === today;
    if (filter === "Bu hafta") return Math.abs(Date.parse(`${event.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) <= 7 * 86_400_000;
    if (filter === "Türkiye") return event.country === "TR";
    if (filter === "ABD") return event.country === "US";
    if (filter === "Avrupa") return event.country === "EU";
    if (filter === "Yüksek etkili") return event.impactLevel === "high";
    return true;
  }), [events, filter, today]);
  return <>
    <section className="page-title-band"><PageContainer className="title-row"><div><span className="eyebrow-label">MAKRO VERİ AKIŞI</span><h1>Ekonomik Takvim</h1></div><p>Türkiye, ABD ve Avrupa’dan piyasayı etkileyebilecek veri ve kararları tek takvimde izle.</p></PageContainer></section>
    <section className="content-section"><PageContainer>
      <SectionHeader eyebrow="TAKVİM" title="Yaklaşan veri ve kararlar" description="Saatler Türkiye saatine çevrilir; beklenti, önceki ve açıklanan değerler haftalık canlı kaynaktan gelir." action={<Badge tone="positive">Canlı haftalık akış</Badge>} />
      <Tabs items={filters} value={filter} onChange={setFilter} label="Ekonomik takvim filtreleri" />
      {loading ? <div className="calendar-loading">{Array.from({ length: 6 }, (_, index) => <Skeleton className="calendar-row-skeleton" key={index} />)}</div> : error && !events.length ? <ErrorState description={error} onRetry={load} /> : visible.length ? <><div className="calendar-table-wrap"><table className="calendar-table"><caption className="sr-only">Ekonomik takvim olayları</caption><thead><tr><th>Tarih</th><th>Saat</th><th>Ülke</th><th>Olay</th><th>Önceki</th><th>Beklenti</th><th>Açıklanan</th><th>Etki</th></tr></thead><tbody>{visible.map((event) => <tr key={event.id}><td>{new Date(`${event.date}T00:00:00+03:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Istanbul" })}</td><td>{event.time}</td><td><span className={`country-flag country-${event.country.toLowerCase()}`}>{event.country}</span>{countryNames[event.country]}</td><td><b>{event.title}</b><small>{event.sourceName}</small></td><td>{event.previous}</td><td>{event.forecast}</td><td>{event.actual ?? "Bekleniyor"}</td><td><Badge tone={event.impactLevel === "high" ? "negative" : event.impactLevel === "medium" ? "warning" : "neutral"}>{event.impactLevel === "high" ? "Yüksek" : event.impactLevel === "medium" ? "Orta" : "Düşük"}</Badge></td></tr>)}</tbody></table></div><div className="calendar-cards">{visible.map((event) => <article key={event.id}><header><time>{new Date(`${event.date}T00:00:00+03:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", timeZone: "Europe/Istanbul" })} · {event.time}</time><Badge tone={event.impactLevel === "high" ? "negative" : event.impactLevel === "medium" ? "warning" : "neutral"}>{event.impactLevel === "high" ? "Yüksek etki" : event.impactLevel === "medium" ? "Orta etki" : "Düşük etki"}</Badge></header><span>{event.country} · {countryNames[event.country]}</span><h3>{event.title}</h3><div><p>Önceki <b>{event.previous}</b></p><p>Beklenti <b>{event.forecast}</b></p><p>Açıklanan <b>{event.actual ?? "Bekleniyor"}</b></p></div><a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.sourceName} ↗</a></article>)}</div></> : <EmptyState title="Bu filtrede olay yok" description="Haftalık canlı kaynakta seçili filtreye uyan yaklaşan olay bulunmuyor." />}
      <Disclaimer>Takvim üçüncü taraf haftalık akıştan alınır. Açıklanan değerleri işlem öncesinde ilgili resmî kurumdan doğrulayın. Bu içerik yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir.</Disclaimer>
    </PageContainer></section>
  </>;
}
