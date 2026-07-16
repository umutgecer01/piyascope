import NewsFeedPage from "../../components/NewsFeedPage";
import { createMetadata } from "../../lib/metadata";

export const metadata = createMetadata("Agenda", "The most important global economic developments with source and impact context.", "/en/agenda", { "tr-TR": "/gundem", en: "/en/agenda" });

export default function EnglishAgendaPage() {
  return <NewsFeedPage locale="en" />;
}
