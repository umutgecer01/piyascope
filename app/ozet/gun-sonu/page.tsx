import BriefPage from "../../components/BriefPage";
import { createMetadata } from "../../lib/metadata";
export const metadata = createMetadata("Gün Sonu Özeti", "BIST, döviz, altın ve kripto hareketlerini günün önemli haberleriyle birlikte değerlendirin.", "/ozet/gun-sonu");
export default function Page() { return <BriefPage type="evening" />; }
