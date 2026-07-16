import EconomicCalendarPage from "../components/EconomicCalendarPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Ekonomik Takvim", "Türkiye, ABD ve Avrupa’dan önemli ekonomik veri ve kararları etki seviyeleriyle takip edin.", "/ekonomik-takvim");
export default function Page() { return <EconomicCalendarPage />; }
