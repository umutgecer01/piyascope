import NewsFeedPage from "../../components/NewsFeedPage";
import { createMetadata } from "../../lib/metadata";

export const metadata = createMetadata("News Radar", "Search and filter global finance news by category, source and confidence level.", "/en/news-radar", { "tr-TR": "/haberler", en: "/en/news-radar" });

export default function EnglishNewsRadarPage() {
  return <NewsFeedPage locale="en" />;
}
