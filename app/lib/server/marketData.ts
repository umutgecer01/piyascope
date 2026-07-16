import { marketCatalog, type MarketCatalogItem } from "../data/catalog";
import type { AssetType, MarketAsset, PricePoint, TimeRange } from "../types";

const TROY_OUNCE_GRAMS = 31.1034768;
const TRADINGVIEW_COLUMNS = [
  "name", "description", "close", "change", "change_abs", "high", "low", "volume",
  "market_cap_basic", "price_earnings_ttm", "price_book_ratio", "dividends_yield_current",
  "sector", "currency", "update_mode", "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.Y",
  "Perf.5Y", "Perf.All", "market_cap_calc", "circulating_supply", "type",
] as const;

const COLUMN = {
  name: 0,
  description: 1,
  close: 2,
  change: 4,
  changePercent: 3,
  high: 5,
  low: 6,
  volume: 7,
  marketCapBasic: 8,
  peRatio: 9,
  priceToBook: 10,
  dividendYield: 11,
  sector: 12,
  currency: 13,
  updateMode: 14,
  perfWeek: 15,
  perfMonth: 16,
  perfThreeMonth: 17,
  perfSixMonth: 18,
  perfYear: 19,
  perfFiveYear: 20,
  perfAll: 21,
  marketCapCalc: 22,
  circulatingSupply: 23,
  type: 24,
} as const;

type ProviderMarket = NonNullable<MarketCatalogItem["providerMarket"]>;
type ScannerRow = { s: string; d: unknown[] };
type ScannerResponse = { data?: ScannerRow[]; totalCount?: number };
type ScannerConfig = {
  market: ProviderMarket;
  range: [number, number];
  sortBy: string;
  sortOrder?: "asc" | "desc";
  filter?: Array<{ left: string; operation: string; right: unknown }>;
};
type CoinGeckoMarket = {
  id: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  price_change_percentage_1y_in_currency?: number;
  circulating_supply: number;
  last_updated: string;
};
type GoldPrice = { price: number; updatedAt: string };

const SCANNER_CONFIGS: ScannerConfig[] = [
  {
    market: "turkey",
    range: [0, 700],
    sortBy: "market_cap_basic",
    filter: [{ left: "type", operation: "in_range", right: ["stock", "fund", "dr", "index"] }],
  },
  {
    market: "forex",
    range: [0, 220],
    sortBy: "volume",
  },
  {
    market: "cfd",
    range: [0, 220],
    sortBy: "volume",
  },
  {
    market: "crypto",
    range: [0, 260],
    sortBy: "market_cap_calc",
  },
];

const asNumber = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function delayFromMode(mode: unknown) {
  if (typeof mode !== "string") return undefined;
  const seconds = Number(mode.match(/(\d+)$/)?.[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : undefined;
}

function sectorName(value: unknown) {
  const labels: Record<string, string> = {
    Transportation: "Ulaştırma",
    "Electronic Technology": "Elektronik Teknoloji",
    "Energy Minerals": "Enerji",
    Finance: "Finans",
    Utilities: "Altyapı",
    "Consumer Non-Durables": "Tüketim",
    "Consumer Services": "Tüketici Hizmetleri",
  };
  return typeof value === "string" ? labels[value] ?? value : undefined;
}

function providerSymbolUrl(providerSymbol?: string) {
  if (!providerSymbol) return "https://www.tradingview.com/markets/";
  return `https://www.tradingview.com/symbols/${providerSymbol.replace(":", "-").replace("/", "")}/`;
}

function sourceUrl(item: MarketCatalogItem) {
  if (item.provider === "gold-api") return "https://gold-api.com/";
  if (item.providerSymbol) return providerSymbolUrl(item.providerSymbol);
  return "https://www.tradingview.com/markets/";
}

function normalizeSymbol(value: unknown, providerSymbol: string) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : providerSymbol.split(":").at(-1) ?? providerSymbol;
  return raw.replace("/", "").replace(/\s+/g, "").toUpperCase();
}

function inferAssetType(market: ProviderMarket, providerSymbol: string, row: ScannerRow): AssetType {
  const name = normalizeSymbol(row.d[COLUMN.name], providerSymbol);
  const typeValue = row.d[COLUMN.type];
  const type = typeof typeValue === "string" ? typeValue.toLowerCase() : "";
  if (market === "forex") return "fx";
  if (market === "crypto") return "crypto";
  if (market === "cfd") return "commodity";
  if (type.includes("index") || /^XU\d+/.test(name) || name.startsWith("BIST")) return "index";
  return "stock";
}

function catalogItemFromScannerRow(market: ProviderMarket, row: ScannerRow): MarketCatalogItem {
  const providerSymbol = row.s;
  const catalogItem = marketCatalog.find((item) => item.providerSymbol === providerSymbol);
  if (catalogItem) return catalogItem;
  const symbol = normalizeSymbol(row.d[COLUMN.name], providerSymbol);
  const descriptionValue = row.d[COLUMN.description];
  const currencyValue = row.d[COLUMN.currency];
  const description = typeof descriptionValue === "string" && descriptionValue.trim()
    ? descriptionValue.trim()
    : symbol;
  const currency = typeof currencyValue === "string" && currencyValue ? currencyValue : market === "turkey" ? "TRY" : "USD";
  return {
    id: `${market}-${symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    symbol,
    name: description,
    assetType: inferAssetType(market, providerSymbol, row),
    currency,
    provider: "tradingview",
    providerMarket: market,
    providerSymbol,
  };
}

function scannerAsset(item: MarketCatalogItem, row: ScannerRow, fetchedAt: string): MarketAsset {
  const d = row.d;
  const price = asNumber(d[COLUMN.close]);
  const change = asNumber(d[COLUMN.change]);
  const mode = d[COLUMN.updateMode];
  const currency = d[COLUMN.currency];
  const marketCapBasic = d[COLUMN.marketCapBasic];
  const marketCapCalc = d[COLUMN.marketCapCalc];
  const peRatio = d[COLUMN.peRatio];
  const priceToBook = d[COLUMN.priceToBook];
  const dividendYield = d[COLUMN.dividendYield];
  const circulatingSupply = d[COLUMN.circulatingSupply];
  const delayMinutes = delayFromMode(mode);
  return {
    id: item.id,
    symbol: item.symbol,
    name: item.name,
    assetType: item.assetType,
    price,
    currency: item.currency || (typeof currency === "string" ? currency : "USD"),
    change,
    changePercent: asNumber(d[COLUMN.changePercent]),
    high: asNumber(d[COLUMN.high], price),
    low: asNumber(d[COLUMN.low], price),
    volume: asNumber(d[COLUMN.volume]),
    updatedAt: fetchedAt,
    sourceName: "TradingView",
    sourceUrl: sourceUrl(item),
    dataStatus: delayMinutes ? "delayed" : "live",
    ...(delayMinutes ? { delayMinutes } : {}),
    ...(isNumber(marketCapBasic) ? { marketCap: marketCapBasic } : isNumber(marketCapCalc) ? { marketCap: marketCapCalc } : {}),
    ...(isNumber(peRatio) ? { peRatio } : {}),
    ...(isNumber(priceToBook) ? { priceToBook } : {}),
    ...(isNumber(dividendYield) ? { dividendYield } : {}),
    ...(sectorName(d[COLUMN.sector]) ? { sector: sectorName(d[COLUMN.sector]) } : {}),
    ...(isNumber(circulatingSupply) ? { circulatingSupply } : {}),
    previousClose: price - change,
    ...(item.unit ? { unit: item.unit } : {}),
    ...(item.relatedSymbols ? { relatedSymbols: item.relatedSymbols } : {}),
    performance: {
      "1G": asNumber(d[COLUMN.changePercent]),
      "1H": asNumber(d[COLUMN.perfWeek]),
      "1A": asNumber(d[COLUMN.perfMonth]),
      "3A": asNumber(d[COLUMN.perfThreeMonth]),
      "1Y": asNumber(d[COLUMN.perfYear]),
      "5Y": asNumber(d[COLUMN.perfFiveYear]),
      MAX: asNumber(d[COLUMN.perfAll]),
    },
  };
}

function scannerBody(config: ScannerConfig, items?: MarketCatalogItem[]) {
  return {
    ...(config.filter ? { filter: config.filter } : {}),
    options: { lang: "tr" },
    markets: [config.market],
    symbols: items?.length ? { tickers: items.map((item) => item.providerSymbol), query: { types: [] } } : { tickers: [], query: { types: [] } },
    columns: TRADINGVIEW_COLUMNS,
    sort: { sortBy: config.sortBy, sortOrder: config.sortOrder ?? "desc" },
    range: config.range,
  };
}

async function fetchScanner(config: ScannerConfig, items?: MarketCatalogItem[]) {
  if (items && !items.length) return [] as MarketAsset[];
  const response = await fetch(`https://scanner.tradingview.com/${config.market}/scan`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Piyascope/1.0" },
    signal: AbortSignal.timeout(14_000),
    body: JSON.stringify(scannerBody(config, items)),
    cf: { cacheTtl: 30, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`TradingView ${config.market} ${response.status}`);
  const payload = await response.json() as ScannerResponse;
  const fetchedAt = new Date().toISOString();
  return (payload.data ?? []).flatMap((row) => {
    const item = items?.find((entry) => entry.providerSymbol === row.s) ?? catalogItemFromScannerRow(config.market, row);
    return item ? [scannerAsset(item, row, fetchedAt)] : [];
  }).filter((asset) => asset.price > 0);
}

async function fetchCrypto() {
  const items = marketCatalog.filter((item) => item.provider === "coingecko");
  if (!items.length) return [] as MarketAsset[];
  const apiKey = process.env.COINGECKO_API_KEY;
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${items.map((item) => item.providerId).join("%2C")}&price_change_percentage=24h%2C7d%2C30d%2C1y&sparkline=false`, {
    headers: apiKey ? { "x-cg-demo-api-key": apiKey } : undefined,
    signal: AbortSignal.timeout(12_000),
    cf: { cacheTtl: 30, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  const payload = await response.json() as CoinGeckoMarket[];
  return payload.flatMap((coin) => {
    const item = items.find((entry) => entry.providerId === coin.id);
    if (!item || !isNumber(coin.current_price)) return [];
    const asset: MarketAsset = {
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      assetType: "crypto",
      price: coin.current_price,
      currency: "USD",
      change: asNumber(coin.price_change_24h),
      changePercent: asNumber(coin.price_change_percentage_24h),
      high: asNumber(coin.high_24h, coin.current_price),
      low: asNumber(coin.low_24h, coin.current_price),
      volume: asNumber(coin.total_volume),
      marketCap: asNumber(coin.market_cap),
      circulatingSupply: asNumber(coin.circulating_supply),
      previousClose: coin.current_price - asNumber(coin.price_change_24h),
      updatedAt: coin.last_updated || new Date().toISOString(),
      sourceName: "CoinGecko",
      sourceUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
      dataStatus: "live",
      relatedSymbols: item.relatedSymbols,
      performance: {
        "1G": asNumber(coin.price_change_percentage_24h_in_currency, coin.price_change_percentage_24h),
        "1H": asNumber(coin.price_change_percentage_7d_in_currency),
        "1A": asNumber(coin.price_change_percentage_30d_in_currency),
        "1Y": asNumber(coin.price_change_percentage_1y_in_currency),
      },
    };
    return [asset];
  });
}

async function fetchGoldPrice(): Promise<GoldPrice> {
  const response = await fetch("https://api.gold-api.com/price/XAU", {
    headers: { "user-agent": "Piyascope/1.0" },
    signal: AbortSignal.timeout(12_000),
    cf: { cacheTtl: 30, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`Gold API ${response.status}`);
  const payload = await response.json() as Partial<GoldPrice>;
  if (!isNumber(payload.price)) throw new Error("Gold API geçersiz fiyat döndürdü.");
  return { price: payload.price, updatedAt: payload.updatedAt || new Date().toISOString() };
}

function combinedReturn(left = 0, right = 0) {
  return ((1 + left / 100) * (1 + right / 100) - 1) * 100;
}

function deriveGramGold(xau: MarketAsset, usdtry: MarketAsset): MarketAsset {
  const price = xau.price * usdtry.price / TROY_OUNCE_GRAMS;
  const changePercent = combinedReturn(xau.changePercent, usdtry.changePercent);
  const previousClose = price / (1 + changePercent / 100);
  const ranges: TimeRange[] = ["1G", "1H", "1A", "3A", "1Y", "5Y", "MAX"];
  const performance = Object.fromEntries(ranges.map((range) => [range, combinedReturn(xau.performance?.[range], usdtry.performance?.[range])])) as Partial<Record<TimeRange, number>>;
  return {
    id: "gautry",
    symbol: "GAUTRY",
    name: "Gram Altın",
    assetType: "commodity",
    price,
    currency: "TRY",
    change: price - previousClose,
    changePercent,
    high: xau.high * usdtry.high / TROY_OUNCE_GRAMS,
    low: xau.low * usdtry.low / TROY_OUNCE_GRAMS,
    volume: 0,
    previousClose,
    updatedAt: [xau.updatedAt, usdtry.updatedAt].sort().at(-1) ?? new Date().toISOString(),
    sourceName: "Gold API + TradingView",
    sourceUrl: "https://gold-api.com/",
    dataStatus: "derived",
    unit: "gram",
    relatedSymbols: ["XAUUSD", "USDTRY"],
    performance,
  };
}

function mergeAssets(groups: MarketAsset[][]) {
  const map = new Map<string, MarketAsset>();
  groups.flat().forEach((asset) => {
    const current = map.get(asset.symbol);
    if (!current || asset.sourceName.includes("CoinGecko") || marketCatalog.some((item) => item.symbol === asset.symbol)) {
      map.set(asset.symbol, asset);
    }
  });
  return [...map.values()];
}

function filterAssets(assets: MarketAsset[], query?: string) {
  const needle = query?.trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR");
  if (!needle) return assets;
  return assets.filter((asset) => {
    const haystack = `${asset.symbol} ${asset.name} ${asset.sector ?? ""} ${asset.assetType}`.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("tr-TR");
    return haystack.includes(needle);
  });
}

function sortAssets(assets: MarketAsset[]) {
  const catalogOrder = new Map(marketCatalog.map((item, index) => [item.symbol, index]));
  const typeOrder: Record<AssetType, number> = { index: 0, stock: 1, fx: 2, commodity: 3, crypto: 4 };
  return [...assets].sort((a, b) => {
    const catalogA = catalogOrder.get(a.symbol);
    const catalogB = catalogOrder.get(b.symbol);
    if (catalogA !== undefined || catalogB !== undefined) return (catalogA ?? 9999) - (catalogB ?? 9999);
    return typeOrder[a.assetType] - typeOrder[b.assetType]
      || (b.marketCap ?? 0) - (a.marketCap ?? 0)
      || a.symbol.localeCompare(b.symbol);
  });
}

export async function getMarketSnapshot(options: { query?: string; limit?: number; offset?: number } = {}) {
  const scannerTasks = SCANNER_CONFIGS.map((config) => fetchScanner(config));
  const catalogTasks = SCANNER_CONFIGS.map((config) => fetchScanner(config, marketCatalog.filter((item) => item.providerMarket === config.market && item.providerSymbol)));
  const results = await Promise.allSettled([...scannerTasks, ...catalogTasks, fetchCrypto(), fetchGoldPrice()]);
  const errors: string[] = [];
  const assetGroups: MarketAsset[][] = [];

  results.slice(0, SCANNER_CONFIGS.length * 2 + 1).forEach((result) => {
    if (result.status === "fulfilled") assetGroups.push(result.value as MarketAsset[]);
    else errors.push(result.reason instanceof Error ? result.reason.message : "Piyasa sağlayıcısı yanıt vermedi.");
  });

  let assets = mergeAssets(assetGroups);
  const goldResult = results.at(-1);
  if (goldResult?.status === "fulfilled") {
    const gold = goldResult.value as GoldPrice;
    const goldIndex = assets.findIndex((asset) => asset.symbol === "XAUUSD");
    if (goldIndex >= 0) {
      const scannerGold = assets[goldIndex];
      const previousClose = scannerGold.previousClose ?? scannerGold.price - scannerGold.change;
      assets[goldIndex] = {
        ...scannerGold,
        price: gold.price,
        change: gold.price - previousClose,
        changePercent: previousClose ? (gold.price - previousClose) / previousClose * 100 : scannerGold.changePercent,
        updatedAt: gold.updatedAt,
        sourceName: "Gold API + TradingView",
        sourceUrl: "https://gold-api.com/",
        dataStatus: "live",
      };
    }
  } else if (goldResult?.status === "rejected") {
    errors.push(goldResult.reason instanceof Error ? goldResult.reason.message : "Altın sağlayıcısı yanıt vermedi.");
  }

  const xau = assets.find((asset) => asset.symbol === "XAUUSD");
  const usdtry = assets.find((asset) => asset.symbol === "USDTRY");
  if (xau && usdtry) {
    assets = assets.filter((asset) => asset.symbol !== "GAUTRY");
    assets.push(deriveGramGold(xau, usdtry));
  } else {
    errors.push("Gram altın için ons altın veya USD/TRY verisi eksik.");
  }

  const filtered = sortAssets(filterAssets(assets, options.query));
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  return {
    assets: limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset),
    total: filtered.length,
    errors: Array.from(new Set(errors)),
    updatedAt: new Date().toISOString(),
  };
}

function periodPoints(asset: MarketAsset, range: TimeRange): PricePoint[] {
  const now = Date.parse(asset.updatedAt) || Date.now();
  const milestones: Record<TimeRange, Array<[TimeRange, number]>> = {
    "1G": [["1G", 1]],
    "1H": [["1H", 7], ["1G", 1]],
    "1A": [["1A", 30], ["1H", 7], ["1G", 1]],
    "3A": [["3A", 90], ["1A", 30], ["1H", 7], ["1G", 1]],
    "1Y": [["1Y", 365], ["3A", 90], ["1A", 30], ["1H", 7], ["1G", 1]],
    "5Y": [["5Y", 1825], ["1Y", 365], ["3A", 90], ["1A", 30], ["1H", 7], ["1G", 1]],
    MAX: [["MAX", 3650], ["5Y", 1825], ["1Y", 365], ["3A", 90], ["1A", 30], ["1H", 7], ["1G", 1]],
  };
  const points = milestones[range].flatMap(([key, days]) => {
    const performance = asset.performance?.[key];
    if (!isNumber(performance) || performance <= -99.99) return [];
    return [{ time: now - days * 86_400_000, value: asset.price / (1 + performance / 100) }];
  });
  return [...points, { time: now, value: asset.price }].sort((a, b) => a.time - b.time);
}

function samplePoints(points: PricePoint[], maxPoints = 260) {
  if (points.length <= maxPoints) return points;
  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}

function pointsToCandles(points: PricePoint[], asset: MarketAsset): PricePoint[] {
  const sorted = [...points].filter((point) => isNumber(point.time) && isNumber(point.value)).sort((a, b) => a.time - b.time);
  return sorted.map((point, index) => {
    const previous = sorted[index - 1];
    const open = index === 0 ? asset.previousClose ?? point.value : previous.value;
    const close = point.value;
    const bodyHigh = Math.max(open, close);
    const bodyLow = Math.min(open, close);
    const movement = Math.max(Math.abs(close - open), Math.abs(close) * 0.001);
    const last = index === sorted.length - 1;
    const high = last ? Math.max(asset.high, bodyHigh) : bodyHigh + movement * 0.18;
    const low = last ? Math.min(asset.low, bodyLow) : Math.max(0, bodyLow - movement * 0.18);
    return {
      ...point,
      value: close,
      open,
      high,
      low,
      close,
      volume: last ? asset.volume : point.volume ?? 0,
      ohlcSource: point.ohlcSource ?? "derived",
    };
  });
}

async function cryptoHistory(item: MarketCatalogItem, range: TimeRange) {
  const days: Record<TimeRange, string> = { "1G": "1", "1H": "7", "1A": "30", "3A": "90", "1Y": "365", "5Y": "1825", MAX: "max" };
  const apiKey = process.env.COINGECKO_API_KEY;
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/${item.providerId}/market_chart?vs_currency=usd&days=${days[range]}`, {
    headers: apiKey ? { "x-cg-demo-api-key": apiKey } : undefined,
    signal: AbortSignal.timeout(15_000),
    cf: { cacheTtl: 300, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`CoinGecko grafik ${response.status}`);
  const payload = await response.json() as { prices?: Array<[number, number]> };
  const prices = (payload.prices ?? []).filter((point) => isNumber(point[0]) && isNumber(point[1]));
  return samplePoints(prices.map(([time, value]) => ({ time, value })));
}

async function fxHistory(asset: MarketAsset, range: TimeRange) {
  const days: Record<TimeRange, number> = { "1G": 5, "1H": 10, "1A": 35, "3A": 100, "1Y": 370, "5Y": 1835, MAX: 7300 };
  const end = new Date();
  const start = new Date(end.getTime() - days[range] * 86_400_000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const base = asset.symbol === "EURTRY" ? "EUR" : "USD";
  const response = await fetch(`https://api.frankfurter.app/${iso(start)}..${iso(end)}?from=${base}&to=TRY`, {
    signal: AbortSignal.timeout(12_000),
    cf: { cacheTtl: 3600, cacheEverything: true },
  } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
  if (!response.ok) throw new Error(`Döviz tarihçesi ${response.status}`);
  const payload = await response.json() as { rates?: Record<string, { TRY?: number }> };
  const points = Object.entries(payload.rates ?? {}).flatMap(([date, rate]) => isNumber(rate.TRY) ? [{ time: Date.parse(`${date}T12:00:00Z`), value: rate.TRY }] : []);
  points.push({ time: Date.parse(asset.updatedAt) || Date.now(), value: asset.price });
  return samplePoints(points.sort((a, b) => a.time - b.time));
}

export async function getMarketHistory(symbol: string, range: TimeRange) {
  const snapshot = await getMarketSnapshot();
  const asset = snapshot.assets.find((entry) => entry.symbol === symbol.toUpperCase());
  if (!asset) return { points: [] as PricePoint[], sourceName: "", sourceUrl: "", updatedAt: snapshot.updatedAt, error: "Varlık verisi alınamadı." };
  const item = marketCatalog.find((entry) => entry.symbol === asset.symbol);
  try {
    if (item?.provider === "coingecko") {
      if (asset.sourceName === "CoinGecko" || process.env.COINGECKO_API_KEY) {
        return { points: pointsToCandles(await cryptoHistory(item, range), asset), sourceName: "CoinGecko", sourceUrl: "https://www.coingecko.com/", updatedAt: new Date().toISOString(), seriesType: "historical" as const, chartType: "derived-ohlc" as const };
      }
      return { points: pointsToCandles(periodPoints(asset, range), asset), sourceName: asset.sourceName, sourceUrl: asset.sourceUrl, updatedAt: asset.updatedAt, seriesType: "performance-points" as const, chartType: "derived-ohlc" as const };
    }
    if (asset.assetType === "fx" && (asset.symbol === "USDTRY" || asset.symbol === "EURTRY")) {
      return { points: pointsToCandles(await fxHistory(asset, range), asset), sourceName: "Frankfurter / ECB referans kurları", sourceUrl: "https://frankfurter.dev/", updatedAt: new Date().toISOString(), seriesType: "reference-series" as const, chartType: "derived-ohlc" as const };
    }
    return { points: pointsToCandles(periodPoints(asset, range), asset), sourceName: asset.sourceName, sourceUrl: asset.sourceUrl, updatedAt: asset.updatedAt, seriesType: "performance-points" as const, chartType: "derived-ohlc" as const };
  } catch (error) {
    const points = pointsToCandles(periodPoints(asset, range), asset);
    return { points, sourceName: asset.sourceName, sourceUrl: asset.sourceUrl, updatedAt: asset.updatedAt, seriesType: "performance-points" as const, chartType: "derived-ohlc" as const, ...(points.length > 1 ? {} : { error: error instanceof Error ? error.message : "Grafik verisi alınamadı." }) };
  }
}
