import type { EconomicEvent, ImpactLevel } from "../../lib/types";

export const dynamic = "force-dynamic";

type FeedEvent = {
  title?: unknown;
  country?: unknown;
  date?: unknown;
  impact?: unknown;
  forecast?: unknown;
  previous?: unknown;
  actual?: unknown;
};

const countryMap: Record<string, EconomicEvent["country"]> = { TRY: "TR", USD: "US", EUR: "EU", GBP: "GB", CNY: "CN" };
const impactMap: Record<string, ImpactLevel> = { high: "high", medium: "medium", low: "low" };

function parts(date: Date) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => values.find((part) => part.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${value("hour")}:${value("minute")}` };
}

function translateTitle(title: string) {
  return title
    .replace(/Core CPI/gi, "Çekirdek TÜFE")
    .replace(/\bCPI\b/gi, "TÜFE")
    .replace(/Core PPI/gi, "Çekirdek ÜFE")
    .replace(/\bPPI\b/gi, "ÜFE")
    .replace(/Retail Sales/gi, "Perakende Satışlar")
    .replace(/Unemployment Claims/gi, "İşsizlik Maaşı Başvuruları")
    .replace(/Unemployment Rate/gi, "İşsizlik Oranı")
    .replace(/Industrial Production/gi, "Sanayi Üretimi")
    .replace(/Trade Balance/gi, "Dış Ticaret Dengesi")
    .replace(/Building Permits/gi, "İnşaat İzinleri")
    .replace(/Housing Starts/gi, "Konut Başlangıçları")
    .replace(/Consumer Sentiment/gi, "Tüketici Güveni")
    .replace(/Interest Rate/gi, "Faiz Kararı")
    .replace(/Rate Statement/gi, "Faiz Kararı Metni")
    .replace(/Press Conference/gi, "Basın Toplantısı")
    .replace(/Speaks/gi, "Konuşması")
    .replace(/m\/m/gi, "aylık")
    .replace(/y\/y/gi, "yıllık");
}

function eventId(title: string, date: string) {
  let hash = 2166136261;
  for (const character of `${title}-${date}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `event-${Math.abs(hash)}`;
}

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "tr";
  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      headers: { "user-agent": "Piyascope/1.0" },
      signal: AbortSignal.timeout(12_000),
      cf: { cacheTtl: 300, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
    if (!response.ok) throw new Error(`Takvim sağlayıcısı ${response.status} yanıtı verdi.`);
    const payload = await response.json() as FeedEvent[];
    const lowerBound = Date.now() - 24 * 60 * 60 * 1000;
    const events = payload.flatMap((entry) => {
      if (typeof entry.title !== "string" || typeof entry.country !== "string" || typeof entry.date !== "string") return [];
      const country = countryMap[entry.country.toUpperCase()];
      const timestamp = Date.parse(entry.date);
      if (!country || !Number.isFinite(timestamp) || timestamp < lowerBound) return [];
      const local = parts(new Date(timestamp));
      const title = locale === "en" ? entry.title : translateTitle(entry.title);
      const event: EconomicEvent = {
        id: eventId(entry.title, entry.date),
        title,
        country,
        date: local.date,
        time: local.time,
        previous: typeof entry.previous === "string" && entry.previous ? entry.previous : "—",
        forecast: typeof entry.forecast === "string" && entry.forecast ? entry.forecast : "—",
        actual: typeof entry.actual === "string" && entry.actual ? entry.actual : null,
        impactLevel: impactMap[String(entry.impact).toLowerCase()] ?? "low",
        sourceName: "Forex Factory Takvimi",
        sourceUrl: "https://www.forexfactory.com/calendar",
      };
      return [event];
    }).sort((a, b) => Date.parse(`${a.date}T${a.time}:00+03:00`) - Date.parse(`${b.date}T${b.time}:00+03:00`));
    return Response.json({ events, updatedAt: new Date().toISOString(), source: "Forex Factory" }, { headers: { "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return Response.json({ events: [], updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Ekonomik takvim alınamadı." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
