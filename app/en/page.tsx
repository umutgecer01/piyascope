import HomeDashboard from "../components/HomeDashboard";
import { createMetadata } from "../lib/metadata";

export const metadata = createMetadata("See the data. Understand the impact.", "Follow global and Türkiye finance news with primary sources, concise context and transparent confidence labels.", "/en", { "tr-TR": "/", en: "/en" });

export default function EnglishHomePage() {
  return <HomeDashboard locale="en" />;
}
