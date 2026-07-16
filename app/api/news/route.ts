export const dynamic = "force-dynamic";

type SourceType = "Birincil" | "Haber";
type Confidence = "A1" | "B1";
type Language = "tr" | "en";
type FeedKind = "official" | "direct" | "aggregator";

type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
  sourceType: SourceType;
  confidence: Confidence;
  sourceDomain: string;
  feedKind: FeedKind;
  summary?: string;
};

type SourceInfo = {
  id: string;
  name: string;
  url: string;
  group: "Türkiye" | "Piyasa" | "Şirket" | "Küresel" | "Teknoloji";
  scope: string;
  cadence: string;
  access: "Doğrudan akış" | "Kaynak bağlantısı";
};

type FeedConfig = {
  id: string;
  category: string;
  url: string;
  format: "rss" | "atom";
  source?: string;
  sourceType: SourceType;
  confidence: Confidence;
  language: Language | "both";
  kind: FeedKind;
  itemLimit?: number;
  baseUrl?: string;
};

type NewsStats = {
  directorySources: number;
  feedCount: number;
  activeFeeds: number;
  failedFeeds: number;
  directFeeds: number;
  primaryCount: number;
  mediaCount: number;
  latestAt: string;
  latencyMs: number;
};

type NewsPayload = {
  news: NewsItem[];
  rates: Array<{ code: string; value: string }>;
  sources: Array<SourceInfo | (Omit<SourceInfo, "group" | "access"> & { group: string; access: string })>;
  stats: NewsStats;
  updatedAt: string;
  mode: "live" | "unavailable";
  error?: string;
};

const CACHE_MS = 45_000;
const FEED_TIMEOUT_MS = 6_500;
const MAX_NEWS = 48;

let payloadCache: { key: Language; expiresAt: number; payload: NewsPayload } | null = null;

const sourceDirectory: SourceInfo[] = [
  { id: "tcmb", name: "TCMB", url: "https://www.tcmb.gov.tr/", group: "Türkiye", scope: "Para politikası, kurlar ve ekonomik veriler", cadence: "Günlük / takvimli", access: "Doğrudan akış" },
  { id: "kap", name: "KAP", url: "https://www.kap.org.tr/tr", group: "Şirket", scope: "Şirket açıklamaları ve finansal raporlar", cadence: "Anlık", access: "Kaynak bağlantısı" },
  { id: "tuik", name: "TÜİK", url: "https://data.tuik.gov.tr/", group: "Türkiye", scope: "Enflasyon, büyüme, iş gücü ve dış ticaret", cadence: "Veri takvimi", access: "Kaynak bağlantısı" },
  { id: "spk", name: "SPK", url: "https://www.spk.gov.tr/", group: "Piyasa", scope: "Kurul bültenleri ve sermaye piyasası kararları", cadence: "Haftalık", access: "Kaynak bağlantısı" },
  { id: "bddk", name: "BDDK", url: "https://www.bddk.org.tr/", group: "Türkiye", scope: "Bankacılık düzenlemeleri ve sektör verileri", cadence: "Haftalık", access: "Kaynak bağlantısı" },
  { id: "hmb", name: "Hazine ve Maliye Bakanlığı", url: "https://www.hmb.gov.tr/", group: "Türkiye", scope: "Kamu finansmanı ve ekonomi programı", cadence: "Duyuru bazlı", access: "Kaynak bağlantısı" },
  { id: "bist", name: "Borsa İstanbul", url: "https://www.borsaistanbul.com/", group: "Piyasa", scope: "Piyasa duyuruları, endeksler ve işlem bilgileri", cadence: "Günlük", access: "Kaynak bağlantısı" },
  { id: "mkk", name: "MKK", url: "https://www.mkk.com.tr/", group: "Piyasa", scope: "Yatırımcı ve kaydi sistem istatistikleri", cadence: "Aylık", access: "Kaynak bağlantısı" },
  { id: "resmigazete", name: "Resmî Gazete", url: "https://www.resmigazete.gov.tr/", group: "Türkiye", scope: "Mevzuat, karar ve düzenlemeler", cadence: "Günlük", access: "Kaynak bağlantısı" },
  { id: "fed", name: "Federal Reserve", url: "https://www.federalreserve.gov/", group: "Küresel", scope: "ABD para politikası ve finansal istikrar", cadence: "Takvimli", access: "Doğrudan akış" },
  { id: "ecb", name: "ECB", url: "https://www.ecb.europa.eu/", group: "Küresel", scope: "Euro Bölgesi para politikası ve veriler", cadence: "Takvimli", access: "Doğrudan akış" },
  { id: "ekonomim", name: "Ekonomim", url: "https://www.ekonomim.com/rss", group: "Piyasa", scope: "Türkiye ekonomi, şirket ve piyasa haberleri", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "dunya", name: "Dünya", url: "https://www.dunya.com/rss", group: "Piyasa", scope: "Ekonomi, reel sektör ve piyasa gündemi", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "finansgundem", name: "Finans Gündem", url: "https://www.finansgundem.com/rss", group: "Piyasa", scope: "Borsa, bankacılık ve finans haberleri", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "ntv", name: "NTV Ekonomi", url: "https://www.ntv.com.tr/ekonomi.rss", group: "Türkiye", scope: "Türkiye ekonomi haberleri", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "cnbc", name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", group: "Küresel", scope: "Küresel iş dünyası ve piyasalar", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "investing", name: "Investing.com", url: "https://www.investing.com/rss/news.rss", group: "Küresel", scope: "Küresel piyasa haberleri", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "marketwatch", name: "MarketWatch", url: "https://www.marketwatch.com/rss/topstories", group: "Küresel", scope: "ABD ve küresel piyasa haberleri", cadence: "Dakikalık", access: "Doğrudan akış" },
  { id: "google-news", name: "Google News", url: "https://news.google.com/", group: "Küresel", scope: "Kapsama araması ve kaynak keşfi", cadence: "Dakikalık", access: "Doğrudan akış" },
];

const feeds: FeedConfig[] = [
  { id: "tcmb-press-tr", category: "Türkiye", url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Basin+Duyurulari", format: "atom", source: "TCMB", sourceType: "Birincil", confidence: "A1", language: "tr", kind: "official", baseUrl: "https://www.tcmb.gov.tr" },
  { id: "tcmb-data-tr", category: "Piyasalar", url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Veriler", format: "atom", source: "TCMB Veri", sourceType: "Birincil", confidence: "A1", language: "tr", kind: "official", baseUrl: "https://www.tcmb.gov.tr" },
  { id: "ekonomim-main", category: "Piyasalar", url: "https://www.ekonomim.com/rss", format: "rss", source: "Ekonomim", sourceType: "Haber", confidence: "B1", language: "tr", kind: "direct" },
  { id: "ekonomim-economy", category: "Türkiye", url: "https://www.ekonomim.com/rss/ekonomi.xml", format: "rss", source: "Ekonomim", sourceType: "Haber", confidence: "B1", language: "tr", kind: "direct" },
  { id: "dunya-main", category: "Türkiye", url: "https://www.dunya.com/rss", format: "rss", source: "Dünya", sourceType: "Haber", confidence: "B1", language: "tr", kind: "direct" },
  { id: "finansgundem-main", category: "Piyasalar", url: "https://www.finansgundem.com/rss", format: "rss", source: "Finans Gündem", sourceType: "Haber", confidence: "B1", language: "tr", kind: "direct" },
  { id: "ntv-economy", category: "Türkiye", url: "https://www.ntv.com.tr/ekonomi.rss", format: "atom", source: "NTV Ekonomi", sourceType: "Haber", confidence: "B1", language: "tr", kind: "direct" },
  { id: "google-tr-economy", category: "Türkiye", url: "https://news.google.com/rss/search?q=T%C3%BCrkiye+ekonomi+finans&hl=tr&gl=TR&ceid=TR:tr", format: "rss", sourceType: "Haber", confidence: "B1", language: "tr", kind: "aggregator", itemLimit: 8 },
  { id: "google-tr-markets", category: "Piyasalar", url: "https://news.google.com/rss/search?q=Borsa+d%C3%B6viz+faiz+alt%C4%B1n&hl=tr&gl=TR&ceid=TR:tr", format: "rss", sourceType: "Haber", confidence: "B1", language: "tr", kind: "aggregator", itemLimit: 8 },
  { id: "google-tr-companies", category: "Şirketler", url: "https://news.google.com/rss/search?q=KAP+%C5%9Firket+bilan%C3%A7o+temett%C3%BC&hl=tr&gl=TR&ceid=TR:tr", format: "rss", sourceType: "Haber", confidence: "B1", language: "tr", kind: "aggregator", itemLimit: 8 },
  { id: "google-tr-tech", category: "Teknoloji", url: "https://news.google.com/rss/search?q=yapay+zeka+teknoloji+ekonomi&hl=tr&gl=TR&ceid=TR:tr", format: "rss", sourceType: "Haber", confidence: "B1", language: "tr", kind: "aggregator", itemLimit: 6 },
  { id: "fed-press", category: "Global", url: "https://www.federalreserve.gov/feeds/press_all.xml", format: "rss", source: "Federal Reserve", sourceType: "Birincil", confidence: "A1", language: "both", kind: "official" },
  { id: "ecb-press", category: "Global", url: "https://www.ecb.europa.eu/rss/press.html", format: "rss", source: "ECB", sourceType: "Birincil", confidence: "A1", language: "both", kind: "official" },
  { id: "ecb-data", category: "Markets", url: "https://www.ecb.europa.eu/rss/statpress.html", format: "rss", source: "ECB Data", sourceType: "Birincil", confidence: "A1", language: "both", kind: "official" },
  { id: "cnbc-business", category: "Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", format: "rss", source: "CNBC", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "cnbc-world", category: "Global", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", format: "rss", source: "CNBC", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "investing-news", category: "Markets", url: "https://www.investing.com/rss/news.rss", format: "rss", source: "Investing.com", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "investing-markets", category: "Markets", url: "https://www.investing.com/rss/market_overview.rss", format: "rss", source: "Investing.com", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "marketwatch-top", category: "Markets", url: "https://www.marketwatch.com/rss/topstories", format: "rss", source: "MarketWatch", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "marketwatch-pulse", category: "Markets", url: "https://feeds.content.dowjones.io/public/rss/mw_marketpulse", format: "rss", source: "MarketWatch Pulse", sourceType: "Haber", confidence: "B1", language: "en", kind: "direct" },
  { id: "google-en-economy", category: "Global", url: "https://news.google.com/rss/search?q=global+economy+central+banks&hl=en-US&gl=US&ceid=US:en", format: "rss", sourceType: "Haber", confidence: "B1", language: "en", kind: "aggregator", itemLimit: 8 },
  { id: "google-en-markets", category: "Markets", url: "https://news.google.com/rss/search?q=markets+stocks+bonds+currencies&hl=en-US&gl=US&ceid=US:en", format: "rss", sourceType: "Haber", confidence: "B1", language: "en", kind: "aggregator", itemLimit: 8 },
  { id: "google-en-companies", category: "Companies", url: "https://news.google.com/rss/search?q=companies+earnings+business&hl=en-US&gl=US&ceid=US:en", format: "rss", sourceType: "Haber", confidence: "B1", language: "en", kind: "aggregator", itemLimit: 8 },
  { id: "google-en-tech", category: "Technology", url: "https://news.google.com/rss/search?q=technology+artificial+intelligence+economy&hl=en-US&gl=US&ceid=US:en", format: "rss", sourceType: "Haber", confidence: "B1", language: "en", kind: "aggregator", itemLimit: 6 },
];

function decodeXml(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function firstTag(block: string, names: string[]) {
  for (const name of names) {
    const value = tag(block, name);
    if (value) return value;
  }
  return "";
}

function attribute(block: string, name: string, attributeName: string) {
  return decodeXml(block.match(new RegExp(`<${name}[^>]*${attributeName}=["']([^"']+)["'][^>]*>`, "i"))?.[1] ?? "");
}

function normalizeDate(value: string) {
  if (!value) return "";
  const monthMap: Record<string, string> = {
    Oca: "Jan",
    Şub: "Feb",
    Mar: "Mar",
    Nis: "Apr",
    May: "May",
    Haz: "Jun",
    Tem: "Jul",
    Ağu: "Aug",
    Eyl: "Sep",
    Eki: "Oct",
    Kas: "Nov",
    Ara: "Dec",
  };
  const normalized = Object.entries(monthMap).reduce((result, [tr, en]) => result.replace(new RegExp(`\\b${tr}\\b`, "g"), en), value);
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function normalizeUrl(value: string, baseUrl?: string) {
  if (!value) return "";
  try {
    return new URL(value.replace(/^http:\/\//, "https://"), baseUrl).href;
  } catch {
    return value.replace(/^http:\/\//, "https://");
  }
}

function domainOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "kaynak";
  }
}

function plainText(value: string, maxLength = 420) {
  return decodeXml(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function cleanTitle(rawTitle: string, source: string) {
  const title = plainText(rawTitle, 260).replace(/\s+/g, " ").trim();
  if (!source) return title;
  return title.replace(new RegExp(`\\s+-\\s+${escapeRegex(source)}$`, "i"), "").trim();
}

function cleanSummary(rawSummary: string, title: string) {
  const text = plainText(rawSummary, 360)
    .replace(new RegExp(`^${escapeRegex(title)}\\s*`, "i"), "")
    .replace(/\s+-\s+[A-Za-zÇĞİÖŞÜçğıöşü0-9 .]+$/, "")
    .trim();
  return text.length > 40 ? text : title;
}

function isRelevant(item: NewsItem) {
  if (item.sourceType === "Birincil") return true;
  const title = item.title.toLocaleLowerCase("tr-TR");
  const summary = (item.summary ?? "").toLocaleLowerCase("tr-TR");
  const text = item.feedKind === "aggregator" ? `${title} ${summary}` : title;
  const excluded = ["magazin", "futbol", "transfer", "ünlü", "dizi", "spor", "yarışma", "15 temmuz", "erik dalı", "büyükelçi", "diplomasi"];
  if (excluded.some((term) => text.includes(term))) return false;
  const financialTerms = [
    "ekonomi", "finans", "piyasa", "borsa", "bist", "döviz", "kur", "faiz", "enflasyon", "bilanço", "temettü",
    "yatırım", "banka", "kredi", "şirket", "ihracat", "ithalat", "vergi", "altın", "petrol", "enerji", "teknoloji",
    "yapay zeka", "kap", "tahvil", "merkez bankası", "tcmb", "fed", "ecb", "economy", "finance", "market", "stock",
    "bond", "currency", "rate", "inflation", "earnings", "investment", "bank", "credit", "company", "trade", "tax",
    "gold", "oil", "energy", "technology", "artificial intelligence", "debt", "central bank",
  ];
  return financialTerms.some((term) => text.includes(term));
}

function itemFromBlock(block: string, feed: FeedConfig, index: number, kind: "rss" | "atom"): NewsItem | null {
  const rawTitle = tag(block, "title");
  const sourceFromTag = tag(block, "source") || tag(block, "dc:creator") || tag(block, "author");
  const source = feed.source ?? (sourceFromTag || domainOf(feed.url));
  const publishedRaw = firstTag(block, kind === "rss" ? ["pubDate", "dc:date", "published", "updated"] : ["published", "updated", "dc:date"]);
  const publishedAt = normalizeDate(publishedRaw);
  const sourceUrl = attribute(block, "source", "url");
  const url = kind === "rss"
    ? normalizeUrl(tag(block, "link") || attribute(block, "guid", "isPermaLink"), feed.baseUrl)
    : normalizeUrl(attribute(block, "link", "href") || tag(block, "id"), feed.baseUrl);
  const title = cleanTitle(rawTitle, source);
  const summary = cleanSummary(firstTag(block, ["description", "summary", "content", "content:encoded"]), title);

  if (!title || !url || !publishedAt) return null;

  return {
    id: `${feed.id}-${hashString(`${url}-${title}-${publishedAt}-${index}`)}`,
    title,
    source,
    url,
    publishedAt,
    category: feed.category,
    sourceType: feed.sourceType,
    confidence: feed.confidence,
    sourceDomain: domainOf(sourceUrl || url),
    feedKind: feed.kind,
    ...(summary ? { summary } : {}),
  };
}

function parseRss(xml: string, feed: FeedConfig): NewsItem[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .slice(0, feed.itemLimit ?? 10)
    .flatMap((match, index) => itemFromBlock(match[1], feed, index, "rss") ?? []);
}

function parseAtom(xml: string, feed: FeedConfig): NewsItem[] {
  return [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)]
    .slice(0, feed.itemLimit ?? 10)
    .flatMap((match, index) => itemFromBlock(match[1], feed, index, "atom") ?? []);
}

async function fetchFeed(feed: FeedConfig) {
  const response = await fetch(feed.url, {
    headers: {
      accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
      "user-agent": "Mozilla/5.0 Piyascope/1.0 (+https://piyascope.local/news)",
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    cf: { cacheTtl: 60, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`${feed.id} ${response.status}`);
  const xml = await response.text();
  return feed.format === "atom" ? parseAtom(xml, feed) : parseRss(xml, feed);
}

function dedupeNews(items: NewsItem[]) {
  const unique = new Map<string, NewsItem>();
  items.forEach((item) => {
    const key = item.title
      .toLocaleLowerCase("tr-TR")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9çğıöşü]/gi, "");
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, item);
      return;
    }
    const existingRank = (existing.sourceType === "Birincil" ? 4 : 0) + (existing.feedKind === "direct" ? 2 : existing.feedKind === "official" ? 3 : 0);
    const nextRank = (item.sourceType === "Birincil" ? 4 : 0) + (item.feedKind === "direct" ? 2 : item.feedKind === "official" ? 3 : 0);
    if (nextRank > existingRank || (nextRank === existingRank && Date.parse(item.publishedAt) > Date.parse(existing.publishedAt))) unique.set(key, item);
  });
  return [...unique.values()];
}

async function fetchNews(language: Language) {
  const startedAt = Date.now();
  const selectedFeeds = feeds.filter((feed) => feed.language === language || feed.language === "both");
  const results = await Promise.allSettled(selectedFeeds.map(fetchFeed));
  const items = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const activeFeeds = results.filter((result) => result.status === "fulfilled").length;
  const newestAllowed = Date.now() + 24 * 3_600_000;
  const oldestAllowed = Date.now() - 45 * 24 * 3_600_000;

  const news = dedupeNews(items)
    .filter((item) => {
      const timestamp = Date.parse(item.publishedAt);
      return isRelevant(item) && timestamp > oldestAllowed && timestamp < newestAllowed;
    })
    .sort((a, b) => {
      const score = (item: NewsItem) => Date.parse(item.publishedAt)
        + (item.sourceType === "Birincil" ? 6 * 3_600_000 : 0)
        + (item.feedKind === "direct" ? 2 * 3_600_000 : 0);
      return score(b) - score(a);
    })
    .slice(0, MAX_NEWS);

  return {
    news,
    stats: {
      feedCount: selectedFeeds.length,
      activeFeeds,
      failedFeeds: selectedFeeds.length - activeFeeds,
      directFeeds: selectedFeeds.filter((feed, index) => feed.kind !== "aggregator" && results[index]?.status === "fulfilled").length,
      latencyMs: Date.now() - startedAt,
    },
  };
}

async function fetchRates() {
  try {
    const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      signal: AbortSignal.timeout(5_500),
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
    if (!response.ok) throw new Error("rate fetch failed");
    const xml = await response.text();
    return ["USD", "EUR", "GBP"].map((code) => {
      const currency = xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${code}"[^>]*>([\\s\\S]*?)<\\/Currency>`, "i"))?.[1] ?? "";
      return { code, value: tag(currency, "ForexSelling") || tag(currency, "BanknoteSelling") || "-" };
    });
  } catch {
    return ["USD", "EUR", "GBP"].map((code) => ({ code, value: "-" }));
  }
}

const sourceEnglish: Record<string, { group: SourceInfo["group"]; scope: string; cadence: string; access: SourceInfo["access"] }> = {
  tcmb: { group: "Türkiye", scope: "Monetary policy, exchange rates and economic data", cadence: "Daily / scheduled", access: "Doğrudan akış" },
  kap: { group: "Şirket", scope: "Company disclosures and financial statements", cadence: "Real time", access: "Kaynak bağlantısı" },
  tuik: { group: "Türkiye", scope: "Inflation, growth, labour and foreign trade", cadence: "Release calendar", access: "Kaynak bağlantısı" },
  spk: { group: "Piyasa", scope: "Capital markets decisions and bulletins", cadence: "Weekly", access: "Kaynak bağlantısı" },
  bddk: { group: "Türkiye", scope: "Banking regulation and sector data", cadence: "Weekly", access: "Kaynak bağlantısı" },
  hmb: { group: "Türkiye", scope: "Public finance and economic programmes", cadence: "Announcement based", access: "Kaynak bağlantısı" },
  bist: { group: "Piyasa", scope: "Market notices, indices and trading information", cadence: "Daily", access: "Kaynak bağlantısı" },
  mkk: { group: "Piyasa", scope: "Investor and central securities system statistics", cadence: "Monthly", access: "Kaynak bağlantısı" },
  resmigazete: { group: "Türkiye", scope: "Legislation, decrees and regulations", cadence: "Daily", access: "Kaynak bağlantısı" },
  fed: { group: "Küresel", scope: "US monetary policy and financial stability", cadence: "Scheduled", access: "Doğrudan akış" },
  ecb: { group: "Küresel", scope: "Euro area monetary policy and statistics", cadence: "Scheduled", access: "Doğrudan akış" },
  ekonomim: { group: "Piyasa", scope: "Türkiye economy, companies and market news", cadence: "Minute-level", access: "Doğrudan akış" },
  dunya: { group: "Piyasa", scope: "Economy, real sector and markets agenda", cadence: "Minute-level", access: "Doğrudan akış" },
  finansgundem: { group: "Piyasa", scope: "Borsa, banking and finance news", cadence: "Minute-level", access: "Doğrudan akış" },
  ntv: { group: "Türkiye", scope: "Türkiye economy news", cadence: "Minute-level", access: "Doğrudan akış" },
  cnbc: { group: "Küresel", scope: "Global business and markets", cadence: "Minute-level", access: "Doğrudan akış" },
  investing: { group: "Küresel", scope: "Global market news", cadence: "Minute-level", access: "Doğrudan akış" },
  marketwatch: { group: "Küresel", scope: "US and global market news", cadence: "Minute-level", access: "Doğrudan akış" },
  "google-news": { group: "Küresel", scope: "Coverage search and source discovery", cadence: "Minute-level", access: "Doğrudan akış" },
};

function localizedSources(language: Language) {
  if (language === "tr") return sourceDirectory;
  const groupNames: Record<SourceInfo["group"], string> = { Türkiye: "Türkiye", Piyasa: "Markets", Şirket: "Companies", Küresel: "Global", Teknoloji: "Technology" };
  const groupRank: Record<string, number> = { Global: 0, Markets: 1, Companies: 2, Technology: 3, Türkiye: 4 };
  return sourceDirectory
    .map((source) => {
      const english = sourceEnglish[source.id];
      return {
        ...source,
        group: groupNames[english?.group ?? source.group],
        scope: english?.scope ?? source.scope,
        cadence: english?.cadence ?? source.cadence,
        access: (english?.access ?? source.access) === "Doğrudan akış" ? "Direct feed" : "Source link",
      };
    })
    .sort((a, b) => (groupRank[a.group] ?? 5) - (groupRank[b.group] ?? 5));
}

export async function getNewsPayload(language: Language, options: { refresh?: boolean } = {}) {
  const now = Date.now();
  if (!options.refresh && payloadCache?.key === language && payloadCache.expiresAt > now) return payloadCache.payload;

  const [feedResult, rates] = await Promise.all([fetchNews(language).catch(() => ({
    news: [] as NewsItem[],
    stats: { feedCount: feeds.filter((feed) => feed.language === language || feed.language === "both").length, activeFeeds: 0, failedFeeds: 0, directFeeds: 0, latencyMs: 0 },
  })), fetchRates()]);
  const news = feedResult.news;
  const primaryCount = news.filter((item) => item.sourceType === "Birincil").length;
  const latestAt = news.map((item) => item.publishedAt).sort().at(-1) ?? "";
  const payload: NewsPayload = {
    news,
    rates,
    sources: localizedSources(language),
    stats: {
      directorySources: sourceDirectory.length,
      feedCount: feedResult.stats.feedCount,
      activeFeeds: feedResult.stats.activeFeeds,
      failedFeeds: feedResult.stats.failedFeeds,
      directFeeds: feedResult.stats.directFeeds,
      primaryCount,
      mediaCount: news.length - primaryCount,
      latestAt,
      latencyMs: feedResult.stats.latencyMs,
    },
    updatedAt: new Date().toISOString(),
    mode: news.length ? "live" : "unavailable",
    ...(news.length ? {} : { error: language === "en" ? "Live news feeds are temporarily unavailable." : "Canlı haber akışlarına geçici olarak ulaşılamıyor." }),
  };
  payloadCache = { key: language, expiresAt: now + CACHE_MS, payload };
  return payload;
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const language = searchParams.get("lang") === "en" ? "en" : "tr";
  const refresh = searchParams.get("refresh") === "1";
  const payload = await getNewsPayload(language, { refresh });
  return Response.json(payload, {
    status: payload.news.length ? 200 : 503,
    headers: {
      "Cache-Control": payload.news.length ? "public, max-age=30, s-maxage=60, stale-while-revalidate=180" : "no-store",
    },
  });
}
