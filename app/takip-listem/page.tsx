import WatchlistPage from "../components/WatchlistPage";
import { createMetadata } from "../lib/metadata";
export const metadata = createMetadata("Takip Listem", "Hisse, döviz, altın, kripto ve haber kategorilerini cihazınızda saklanan kişisel listenizde takip edin.", "/takip-listem");
export default function Page() { return <WatchlistPage />; }
