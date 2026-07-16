import BriefPage from "../../components/BriefPage";
import { createMetadata } from "../../lib/metadata";
export const metadata = createMetadata("Sabah Özeti", "Günün ekonomik verileri, şirket haberleri ve piyasa görünümünü beş dakikada okuyun.", "/ozet/sabah");
export default function Page() { return <BriefPage type="morning" />; }
