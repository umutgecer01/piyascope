import { getNewsPayload } from "../../news/route";
import { marketCatalog } from "../../../lib/data/catalog";
import { getMarketSnapshot } from "../../../lib/server/marketData";
import { INVESTMENT_DISCLAIMER, type AIAnalysis, type AnalysisSource, type MarketAsset } from "../../../lib/types";

export const dynamic = "force-dynamic";

type AnalyzeBody = { question?: unknown; assetSymbol?: unknown; newsId?: unknown };

function inferredSymbols(question: string, explicit?: string) {
  const upper = question.toLocaleUpperCase("tr-TR").replaceAll("/", "");
  const symbols = marketCatalog.filter((item) => upper.includes(item.symbol) || upper.includes(item.name.toLocaleUpperCase("tr-TR"))).map((item) => item.symbol);
  if (/DOLAR|USD/.test(upper)) symbols.push("USDTRY");
  if (/EURO|EUR/.test(upper)) symbols.push("EURTRY");
  if (/ALTIN|GOLD/.test(upper)) symbols.push("GAUTRY", "XAUUSD");
  if (/BORSA|BIST/.test(upper)) symbols.push("XU100");
  if (/BITCOIN/.test(upper)) symbols.push("BTC");
  if (/ETHEREUM/.test(upper)) symbols.push("ETH");
  return [...new Set([...(explicit ? [explicit] : []), ...symbols])].slice(0, 4);
}

function relevantTerms(question: string) {
  const stop = new Set(["bugün", "neden", "nasıl", "oldu", "olan", "piyasa", "etkiler", "etkileyebilir", "gelişmeler", "neler"]);
  return question.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü\s]/g, " ").split(/\s+/).filter((term) => term.length > 3 && !stop.has(term));
}

function formatAsset(asset: MarketAsset) {
  const price = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: asset.price < 10 ? 4 : 2 }).format(asset.price);
  const direction = asset.changePercent >= 0 ? "yükseliş" : "düşüş";
  const delay = asset.delayMinutes ? `, yaklaşık ${asset.delayMinutes} dakika gecikmeli` : "";
  return `${asset.symbol} ${price} ${asset.currency}; günlük %${Math.abs(asset.changePercent).toFixed(2)} ${direction}${delay}`;
}

function uniqueSources(sources: AnalysisSource[]) {
  return [...new Map(sources.map((source) => [source.url, source])).values()].slice(0, 8);
}

export async function POST(request: Request) {
  let body: AnalyzeBody;
  try { body = await request.json() as AnalyzeBody; }
  catch { return Response.json({ error: "Geçerli bir JSON gövdesi gönderilmelidir." }, { status: 400 }); }

  if (typeof body.question !== "string" || body.question.trim().length < 3 || body.question.length > 600) {
    return Response.json({ error: "Soru 3 ile 600 karakter arasında olmalıdır." }, { status: 400 });
  }

  const question = body.question.trim();
  const explicit = typeof body.assetSymbol === "string" ? body.assetSymbol.slice(0, 20).toUpperCase() : undefined;
  const [marketResult, newsResult] = await Promise.allSettled([getMarketSnapshot(), getNewsPayload("tr")]);
  const market = marketResult.status === "fulfilled" ? marketResult.value : { assets: [], errors: ["Piyasa akışı alınamadı."], updatedAt: new Date().toISOString() };
  const newsPayload = newsResult.status === "fulfilled" ? newsResult.value : { news: [], updatedAt: new Date().toISOString(), mode: "unavailable" as const };
  if (!market.assets.length && !newsPayload.news.length) return Response.json({ error: "Güncel kaynaklara şu anda ulaşılamıyor; kaynak olmadan analiz üretilmedi." }, { status: 503 });

  const symbols = inferredSymbols(question, explicit);
  const selectedAssets = (symbols.length ? symbols : ["XU100", "USDTRY", "GAUTRY", "BTC"]).flatMap((symbol) => {
    const asset = market.assets.find((entry) => entry.symbol === symbol);
    return asset ? [asset] : [];
  });
  const terms = relevantTerms(question);
  const requestedNewsId = typeof body.newsId === "string" ? body.newsId : undefined;
  const relevantNews = newsPayload.news.filter((item) => item.id === requestedNewsId || terms.some((term) => `${item.title} ${item.summary ?? ""}`.toLocaleLowerCase("tr-TR").includes(term)) || symbols.some((symbol) => item.title.toLocaleUpperCase("tr-TR").includes(symbol))).slice(0, 4);
  const headlines = relevantNews.length ? relevantNews : newsPayload.news.slice(0, 3);
  const asOf = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }).format(new Date(market.updatedAt));
  const marketSentence = selectedAssets.length ? `Alınan son piyasa verisi (${asOf}): ${selectedAssets.map(formatAsset).join("; ")}.` : "Soruyla doğrudan eşleşen güncel fiyat verisi bulunamadı.";
  const newsSentence = headlines.length ? `Eş zamanlı haber akışında öne çıkan doğrulanabilir başlıklar: ${headlines.map((item) => `“${item.title}” (${item.source})`).join("; ")}.` : "Soruyla doğrudan eşleşen güncel haber bulunamadı.";
  const caution = /neden|niçin/.test(question.toLocaleLowerCase("tr-TR"))
    ? "Bu veriler birlikte hareketi açıklamaya yardımcı olabilir; ancak yalnızca zaman eşleşmesi nedensellik kanıtı değildir. Hacim, açıklamanın özgün metni ve piyasanın önceden fiyatladığı beklenti ayrıca kontrol edilmelidir."
    : "Olası etki; verinin beklentiden sapmasına, açıklamanın ayrıntılarına ve piyasanın önceden fiyatladığı senaryoya göre değişebilir. Kesin yön veya fiyat hedefi çıkarılamaz.";
  const sources = uniqueSources([
    ...selectedAssets.map((asset) => ({ name: asset.sourceName, url: asset.sourceUrl })),
    ...headlines.map((item) => ({ name: item.source, url: item.url })),
  ]);
  const confidence = selectedAssets.length && headlines.length >= 2 ? "high" : selectedAssets.length || headlines.length ? "medium" : "low";
  const response: AIAnalysis = {
    id: crypto.randomUUID(),
    answer: `${marketSentence} ${newsSentence} ${caution}`,
    confidence,
    sources,
    relatedAssets: selectedAssets.map((asset) => asset.symbol),
    createdAt: new Date().toISOString(),
    disclaimer: INVESTMENT_DISCLAIMER,
    analysisMode: "source-synthesis",
  };
  return Response.json(response, { headers: { "Cache-Control": "no-store" } });
}
