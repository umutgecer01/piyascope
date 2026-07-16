import MarketsDashboard from "../components/MarketsDashboard";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Piyasalar", "Borsa, döviz, altın ve kripto varlıklarını fiyat, değişim ve ilgili haberlerle karşılaştırın.", "/piyasalar", { "tr-TR": "/piyasalar", en: "/en/markets" });

export default function PiyasalarPage() {
  return <MarketsDashboard />;
}
