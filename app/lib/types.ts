export type SiteLocale = "tr" | "en";

export type AssetType = "stock" | "index" | "fx" | "commodity" | "crypto";
export type ImpactLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type TimeRange = "1G" | "1H" | "1A" | "3A" | "1Y" | "5Y" | "MAX";
export type DataStatus = "live" | "delayed" | "reference" | "derived";

export type MarketAsset = {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: string;
  sourceName: string;
  sourceUrl: string;
  dataStatus: DataStatus;
  delayMinutes?: number;
  performance?: Partial<Record<TimeRange, number>>;
  sector?: string;
  marketCap?: number;
  peRatio?: number;
  priceToBook?: number;
  dividendYield?: number;
  latestFinancialPeriod?: string;
  circulatingSupply?: number;
  previousClose?: number;
  unit?: string;
  relatedSymbols?: string[];
};

export type PricePoint = {
  time: number;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  ohlcSource?: "native" | "derived";
};

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  source: string;
  sourceUrl: string;
  sourceDomain?: string;
  imageUrl: string;
  publishedAt: string;
  updatedAt: string;
  impactLevel: ImpactLevel;
  relatedAssets: string[];
  readingTime: number;
  sourceType: "primary" | "news" | "editorial";
  confidence: "A1" | "B1";
  viewScore: number;
};

export type EconomicEvent = {
  id: string;
  title: string;
  country: "TR" | "US" | "EU" | "GB" | "CN" | "GLOBAL";
  date: string;
  time: string;
  previous: string;
  forecast: string;
  actual: string | null;
  impactLevel: ImpactLevel;
  sourceName: string;
  sourceUrl: string;
};

export type AnalysisSource = {
  name: string;
  url: string;
};

export type AIAnalysis = {
  id: string;
  answer: string;
  confidence: ConfidenceLevel;
  sources: AnalysisSource[];
  relatedAssets: string[];
  createdAt: string;
  disclaimer: string;
  analysisMode: "source-synthesis" | "ai";
};

export type WatchlistItem = {
  id: string;
  assetSymbol?: string;
  category?: string;
  addedAt: string;
  order: number;
};

export type AlertCondition = "above" | "below";

export type PriceAlert = {
  id: string;
  assetSymbol: string;
  condition: AlertCondition;
  targetPrice: number;
  isActive: boolean;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: "asset" | "news" | "category" | "page";
  href: string;
  symbol?: string;
};

export type ServiceResult<T> = {
  data: T;
  updatedAt: string;
  error?: string;
  sourceName?: string;
  sourceUrl?: string;
  seriesType?: "historical" | "reference-series" | "performance-points";
  chartType?: "ohlc" | "derived-ohlc";
};

export type SourceRecord = {
  id: string;
  name: string;
  type: "official" | "news" | "market" | "company" | "international";
  description: string;
  url: string;
  status: "live" | "linked" | "delayed";
  usedFor: string[];
  lastCheckedAt?: string;
};

export const INVESTMENT_DISCLAIMER =
  "Bu içerik yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir.";
