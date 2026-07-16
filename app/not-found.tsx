import Link from "next/link";
import { PageContainer } from "./components/ui/primitives";

export default function NotFound() { return <section className="not-found"><PageContainer><span>404</span><h1>Bu sayfa piyasa akışında yok.</h1><p>Bağlantı değişmiş veya içerik kaldırılmış olabilir.</p><div><Link className="ui-button button-primary button-md" href="/">Ana sayfaya dön</Link><Link className="ui-button button-secondary button-md" href="/haberler">Haberlere git</Link></div></PageContainer></section>; }
