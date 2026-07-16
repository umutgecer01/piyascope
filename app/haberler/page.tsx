import NewsFeedPage from "../components/NewsFeedPage";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("Haberler", "Ekonomi ve finans haberlerini kaynak, varlık ve etki seviyesine göre filtreleyin.", "/haberler", { "tr-TR": "/haberler", en: "/en/news-radar" });

export default function HaberlerPage() { return <NewsFeedPage />; }
