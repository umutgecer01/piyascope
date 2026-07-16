import type { Metadata } from "next";
import AssetDetailView from "../../components/AssetDetailView";
import { marketCatalog } from "../../lib/data/catalog";

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const asset = marketCatalog.find((item) => item.symbol === decodeURIComponent(symbol).toUpperCase());
  return { title: asset ? `${asset.symbol} ${asset.name}` : "Varlık Detayı", description: asset ? `${asset.name} güncel fiyatı, kaynak bilgisi, dönem grafiği, temel metrikler ve ilgili haberler.` : "Piyascope varlık detay sayfası.", alternates: { canonical: `/varlik/${encodeURIComponent(symbol.toUpperCase())}` }, openGraph: { title: `${asset?.symbol ?? symbol} — Piyascope`, url: `/varlik/${encodeURIComponent(symbol.toUpperCase())}` } };
}

export default async function VarlikPage({ params }: Props) { const { symbol } = await params; return <AssetDetailView symbol={decodeURIComponent(symbol).toUpperCase()} />; }
