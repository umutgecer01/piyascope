import SourcesPage from "../../components/SourcesPage";
import { createMetadata } from "../../lib/metadata";

export const metadata = createMetadata("Sources", "The official institutions and global references behind Piyascope's coverage.", "/en/sources", { "tr-TR": "/kaynaklar", en: "/en/sources" });

export default function EnglishSourcesPage() {
  return <SourcesPage locale="en" />;
}
