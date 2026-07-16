import AIAnalystPage from "../components/AIAnalystPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("AI Analist", "Finans ve piyasa sorularını güncel fiyat ve haber kaynaklarından oluşturulan, belirsizliği açık analizlerle inceleyin.", "/ai-analist");
export default function Page() { return <AIAnalystPage />; }
