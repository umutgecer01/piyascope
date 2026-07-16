import NewsFeedPage from "../components/NewsFeedPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Gündem", "Ekonomi ve finans gündemindeki önemli gelişmeleri kaynakları ve etki notlarıyla izleyin.", "/gundem", { "tr-TR": "/gundem", en: "/en/agenda" });

export default function GundemPage() {
  return <NewsFeedPage />;
}
