import SourcesPage from "../components/SourcesPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Kaynaklar", "Piyascope'un izlediği resmî veri, şirket açıklaması ve uluslararası kurum kaynakları.", "/kaynaklar", { "tr-TR": "/kaynaklar", en: "/en/sources" });

export default function KaynaklarPage() {
  return <SourcesPage />;
}
