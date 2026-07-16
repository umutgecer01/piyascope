import MarketsDashboard from "../../components/MarketsDashboard";
import { createMetadata } from "../../lib/metadata";

export const metadata = createMetadata("Markets", "Exchange rates, market flow and developments that shape global pricing.", "/en/markets", { "tr-TR": "/piyasalar", en: "/en/markets" });

export default function EnglishMarketsPage() {
  return <MarketsDashboard locale="en" />;
}
