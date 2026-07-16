import { getMarketHistory, getMarketSnapshot } from "../../lib/server/marketData";
import type { TimeRange } from "../../lib/types";

export const dynamic = "force-dynamic";

const ranges = new Set<TimeRange>(["1G", "1H", "1A", "3A", "1Y", "5Y", "MAX"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  const query = url.searchParams.get("query") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "0") || undefined;
  const offset = Number(url.searchParams.get("offset") ?? "0") || undefined;
  const requestedRange = url.searchParams.get("range") as TimeRange | null;
  if (requestedRange && !ranges.has(requestedRange)) return Response.json({ error: "Geçersiz zaman aralığı." }, { status: 400 });

  if (symbol && requestedRange) {
    const history = await getMarketHistory(symbol, requestedRange);
    return Response.json(history, { status: history.points.length ? 200 : 503, headers: { "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=600" } });
  }

  const snapshot = await getMarketSnapshot({ query, limit, offset });
  if (symbol) {
    const asset = snapshot.assets.find((entry) => entry.symbol === symbol) ?? null;
    return Response.json({ asset, updatedAt: snapshot.updatedAt, errors: snapshot.errors }, { status: asset ? 200 : 503, headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120" } });
  }
  return Response.json({ assets: snapshot.assets, total: snapshot.total, updatedAt: snapshot.updatedAt, errors: snapshot.errors }, { status: snapshot.assets.length ? 200 : 503, headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120" } });
}
