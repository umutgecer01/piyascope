import AlertsPage from "../components/AlertsPage";
import { createMetadata } from "../lib/metadata";
export const metadata = createMetadata("Fiyat Alarmları", "Güncel kaynak fiyatlarıyla karşılaştırılan ve cihazınızda saklanan fiyat koşulları oluşturun.", "/alarmlar");
export default function Page() { return <AlertsPage />; }
