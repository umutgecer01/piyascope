import NewsFeedPage from "../components/NewsFeedPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Haber Radarı", "Finans haberlerini kategori, kaynak ve anahtar kelimeye göre tarayın.", "/haber-radari", { "tr-TR": "/haber-radari", en: "/en/news-radar" });

export default function HaberRadariPage() {
  return <NewsFeedPage />;
}
