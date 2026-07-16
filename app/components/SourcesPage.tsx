"use client";

import { useState } from "react";
import { sourceRecords } from "../lib/data/catalog";
import type { SiteLocale, SourceRecord } from "../lib/types";
import { Badge, Disclaimer, PageContainer, SectionHeader, Tabs } from "./ui/primitives";

const typeLabels: Record<SourceRecord["type"], string> = { official: "Resmî kurum", news: "Haber kaynağı", market: "Piyasa verisi", company: "Şirket bildirimi", international: "Uluslararası veri" };

export default function SourcesPage({ locale = "tr" }: { locale?: SiteLocale }) {
  const [filter, setFilter] = useState("Tümü");
  const visible = sourceRecords.filter((source) => filter === "Tümü" || typeLabels[source.type] === filter);
  return <>
    <section className="page-title-band"><PageContainer className="title-row"><div><span className="eyebrow-label">ŞEFFAF KAYNAK AĞI</span><h1>{locale === "en" ? "Sources you can verify." : "Doğrulayabileceğin kaynaklar."}</h1></div><p>Her içerikte özgün yayına ulaşmanı sağlayan resmî kurum, piyasa altyapısı ve uluslararası veri ağı.</p></PageContainer></section>
    <section className="content-section"><PageContainer>
      <SectionHeader eyebrow="KAYNAK REHBERİ" title={`${visible.length} doğrulanabilir kanal`} description="Canlı bağlı akışlar ile doğrudan kaynak bağlantıları birbirinden açıkça ayrılır." />
      <Tabs items={["Tümü", ...new Set(Object.values(typeLabels))]} value={filter} onChange={setFilter} label="Kaynak türleri" />
      <div className="source-record-grid">{visible.map((source, index) => <article key={source.id}><header><span>{String(index + 1).padStart(2, "0")}</span><Badge tone={source.status === "live" ? "positive" : source.status === "delayed" ? "warning" : "neutral"}>{source.status === "live" ? "Canlı bağlı" : source.status === "delayed" ? "Gecikmeli akış" : "Kaynak bağlantısı"}</Badge></header><p>{typeLabels[source.type]}</p><h2>{source.name}</h2><div>{source.description}</div><ul>{source.usedFor.map((usage) => <li key={usage}>{usage}</li>)}</ul><footer><span>{source.lastCheckedAt ? `Son kontrol ${new Date(source.lastCheckedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}` : source.status === "live" ? "İstek anında güncellenir" : source.status === "delayed" ? "Sağlayıcı gecikmesi uygulanır" : "Doğrudan kaynak bağlantısı"}</span><a href={source.url} target="_blank" rel="noopener noreferrer">Kaynağa git ↗</a></footer></article>)}</div>
      <Disclaimer>Piyascope kaynakları mümkün olduğunda doğrudan resmî yayınlardan izler. Haber akışındaki üçüncü taraf içerikler B1 olarak ayrılır. Bu içerik yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir.</Disclaimer>
    </PageContainer></section>
  </>;
}
