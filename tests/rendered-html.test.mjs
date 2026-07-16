import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const env = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const ctx = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders development preview metadata", async () => {
  const worker = await loadWorker();

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    ctx,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("critical product routes render successfully", async () => {
  const worker = await loadWorker();
  const routes = [
    "/",
    "/haberler",
    "/piyasalar",
    "/varlik/THYAO",
    "/ekonomik-takvim",
    "/ai-analist",
    "/ozet/sabah",
    "/ozet/gun-sonu",
    "/takip-listem",
    "/alarmlar",
    "/kaynaklar",
    "/hakkimizda",
    "/en",
  ];

  for (const route of routes) {
    const response = await worker.fetch(new Request(`http://localhost${route}`, { headers: { accept: "text/html" } }), env, ctx);
    assert.equal(response.status, 200, `${route} should render`);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, `${route} should return HTML`);
  }
});

test("AI analyze endpoint validates and returns a source-backed response", async () => {
  const worker = await loadWorker();
  const invalid = await worker.fetch(new Request("http://localhost/api/ai/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "x" }) }), env, ctx);
  assert.equal(invalid.status, 400);

  const response = await worker.fetch(new Request("http://localhost/api/ai/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: "TCMB faiz kararı borsayı nasıl etkileyebilir?", assetSymbol: "XU100" }) }), env, ctx);
  const body = await response.json();
  if (response.status === 503) {
    assert.match(body.error, /güncel kaynaklara/i);
    assert.equal("answer" in body, false);
    assert.equal("isDemo" in body, false);
    return;
  }
  assert.equal(response.status, 200);
  assert.equal(body.analysisMode, "source-synthesis");
  assert.equal("isDemo" in body, false);
  assert.ok(["low", "medium", "high"].includes(body.confidence));
  assert.ok(Array.isArray(body.sources) && body.sources.length > 0);
  assert.deepEqual(body.relatedAssets, ["XU100"]);
  assert.equal(body.disclaimer, "Bu içerik yalnızca bilgilendirme amaçlıdır ve yatırım tavsiyesi değildir.");
  assert.doesNotMatch(body.answer, /(^|[.!?]\s+)(al|sat|tut)(?:[.!?,\s]|$)/i);
});

test("SEO utility routes are available", async () => {
  const worker = await loadWorker();
  for (const route of ["/robots.txt", "/sitemap.xml"]) {
    const response = await worker.fetch(new Request(`http://localhost${route}`), env, ctx);
    assert.equal(response.status, 200, `${route} should render`);
  }
});
