import type { Metadata } from "next";
import NewsDetailView from "../../components/NewsDetailView";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: "Haber Detayı", description: "Kaynak, ilgili varlıklar ve yapay zekâ destekli etki analiziyle finans haberi.", alternates: { canonical: `/haber/${slug}` }, openGraph: { type: "article", title: "Finans Haberi — Piyascope", url: `/haber/${slug}` }, twitter: { card: "summary_large_image" } };
}

export default async function HaberPage({ params }: Props) { const { slug } = await params; return <NewsDetailView slug={slug} />; }
