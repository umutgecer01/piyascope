import type { AssetType, SourceRecord } from "../types";

export type MarketCatalogItem = {
  id: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
  provider: "tradingview" | "coingecko" | "gold-api" | "derived";
  providerMarket?: "turkey" | "forex" | "cfd" | "crypto";
  providerSymbol?: string;
  providerId?: string;
  unit?: string;
  relatedSymbols?: string[];
};

export const marketCatalog: MarketCatalogItem[] = [
  { id: "xu100", symbol: "XU100", name: "BIST 100", assetType: "index", currency: "TRY", provider: "tradingview", providerMarket: "turkey", providerSymbol: "BIST:XU100", unit: "Endeks değeri", relatedSymbols: ["THYAO", "ASELS", "TUPRS"] },
  { id: "usdtry", symbol: "USDTRY", name: "USD/TRY", assetType: "fx", currency: "TRY", provider: "tradingview", providerMarket: "forex", providerSymbol: "FX_IDC:USDTRY", unit: "1 ABD doları", relatedSymbols: ["GAUTRY", "XU100"] },
  { id: "eurtry", symbol: "EURTRY", name: "EUR/TRY", assetType: "fx", currency: "TRY", provider: "tradingview", providerMarket: "forex", providerSymbol: "FX_IDC:EURTRY", unit: "1 euro", relatedSymbols: ["USDTRY", "XU100"] },
  { id: "xauusd", symbol: "XAUUSD", name: "Ons Altın", assetType: "commodity", currency: "USD", provider: "gold-api", providerMarket: "cfd", providerSymbol: "OANDA:XAUUSD", providerId: "XAU", unit: "ons", relatedSymbols: ["GAUTRY", "USDTRY"] },
  { id: "gautry", symbol: "GAUTRY", name: "Gram Altın", assetType: "commodity", currency: "TRY", provider: "derived", unit: "gram", relatedSymbols: ["XAUUSD", "USDTRY"] },
  { id: "btc", symbol: "BTC", name: "Bitcoin", assetType: "crypto", currency: "USD", provider: "coingecko", providerMarket: "crypto", providerSymbol: "COINBASE:BTCUSD", providerId: "bitcoin", relatedSymbols: ["ETH"] },
  { id: "eth", symbol: "ETH", name: "Ethereum", assetType: "crypto", currency: "USD", provider: "coingecko", providerMarket: "crypto", providerSymbol: "COINBASE:ETHUSD", providerId: "ethereum", relatedSymbols: ["BTC"] },
  { id: "thyao", symbol: "THYAO", name: "Türk Hava Yolları", assetType: "stock", currency: "TRY", provider: "tradingview", providerMarket: "turkey", providerSymbol: "BIST:THYAO", relatedSymbols: ["PGSUS", "TAVHL"] },
  { id: "asels", symbol: "ASELS", name: "Aselsan", assetType: "stock", currency: "TRY", provider: "tradingview", providerMarket: "turkey", providerSymbol: "BIST:ASELS", relatedSymbols: ["OTKAR", "SDTTR"] },
  { id: "tuprs", symbol: "TUPRS", name: "Tüpraş", assetType: "stock", currency: "TRY", provider: "tradingview", providerMarket: "turkey", providerSymbol: "BIST:TUPRS", relatedSymbols: ["PETKM", "AYGAZ"] },
];

export const sourceRecords: SourceRecord[] = [
  { id: "tradingview", name: "TradingView", type: "market", description: "Borsa İstanbul, döviz, kripto ve dönem performansı verileri. BIST fiyatları lisans koşullarına göre gecikmeli olabilir.", url: "https://www.tradingview.com/markets/stocks-turkey/", status: "delayed", usedFor: ["BIST 100", "Hisseler", "Döviz", "Kripto", "Dönem performansı"] },
  { id: "coingecko", name: "CoinGecko", type: "market", description: "Sunucu erişimi veya anahtarı bulunduğunda kripto tarihsel serisi ve zengin metrikler için tercih edilen ek kaynak.", url: "https://www.coingecko.com/", status: "linked", usedFor: ["Kripto tarihsel seri", "Kripto metrikleri"] },
  { id: "gold-api", name: "Gold API", type: "market", description: "Kimlik doğrulaması gerektirmeyen güncel ons altın fiyatı.", url: "https://gold-api.com/", status: "live", usedFor: ["Ons altın", "Gram altın hesaplaması"] },
  { id: "tcmb", name: "TCMB", type: "official", description: "Resmî gösterge döviz kurları, para politikası kararları ve veri yayınları.", url: "https://www.tcmb.gov.tr/", status: "live", usedFor: ["Döviz referansı", "Para politikası", "Haber"] },
  { id: "forex-factory", name: "Forex Factory Takvimi", type: "international", description: "Haftalık küresel ekonomik olay, beklenti, önceki ve açıklanan değer akışı.", url: "https://www.forexfactory.com/calendar", status: "live", usedFor: ["Ekonomik takvim"] },
  { id: "kap", name: "KAP", type: "company", description: "Şirket bildirimleri, finansal tablolar ve özel durum açıklamaları.", url: "https://www.kap.org.tr/tr", status: "linked", usedFor: ["Şirket haberleri", "Bilanço"] },
  { id: "tuik", name: "TÜİK", type: "official", description: "Enflasyon, büyüme, iş gücü ve dış ticaret istatistikleri.", url: "https://data.tuik.gov.tr/", status: "linked", usedFor: ["Makro veri doğrulama"] },
  { id: "fed", name: "Federal Reserve", type: "international", description: "ABD para politikası ve resmî açıklamaları; doğrudan akış erişilemediğinde özgün kaynak bağlantısı sunulur.", url: "https://www.federalreserve.gov/", status: "linked", usedFor: ["Küresel haber", "Faiz"] },
  { id: "ecb", name: "ECB", type: "international", description: "Euro Bölgesi para politikası ve istatistikleri; doğrudan akış erişilemediğinde özgün kaynak bağlantısı sunulur.", url: "https://www.ecb.europa.eu/", status: "linked", usedFor: ["Küresel haber", "Döviz"] },
];
