"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  Eraser,
  Expand,
  Hand,
  Maximize2,
  Minus,
  MousePointer2,
  MoveDiagonal2,
  Pencil,
  Ruler,
  Save,
  Square,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { PricePoint } from "../lib/types";

type DrawingTool = "cursor" | "trend" | "horizontal" | "vertical" | "rectangle" | "fib" | "measure";

type DrawingShape = {
  id: string;
  tool: Exclude<DrawingTool, "cursor">;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ohlcSource: "native" | "derived";
};

const tools: Array<{ id: DrawingTool; label: string; hint: string; icon: typeof MousePointer2 }> = [
  { id: "cursor", label: "İmleç", hint: "Grafiği incele", icon: MousePointer2 },
  { id: "trend", label: "Trend", hint: "İki nokta arasında trend çiz", icon: MoveDiagonal2 },
  { id: "horizontal", label: "Yatay", hint: "Destek/direnç seviyesi", icon: Minus },
  { id: "vertical", label: "Dikey", hint: "Zaman işaretleyici", icon: Expand },
  { id: "rectangle", label: "Kutu", hint: "Fiyat bölgesi işaretle", icon: Square },
  { id: "fib", label: "Fibo", hint: "Fibonacci geri çekilme alanı", icon: Hand },
  { id: "measure", label: "Ölç", hint: "Alan ve hareket ölçümü", icon: Ruler },
];

const numberFormat = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 });
const compactFormat = new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 });

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeShape(shape: DrawingShape): DrawingShape {
  if (shape.tool === "horizontal") return { ...shape, x1: 0, x2: 100, y2: shape.y1 };
  if (shape.tool === "vertical") return { ...shape, y1: 0, y2: 100, x2: shape.x1 };
  return shape;
}

function distance(shape: DrawingShape) {
  return Math.abs(shape.x2 - shape.x1) + Math.abs(shape.y2 - shape.y1);
}

function pct(value: number) {
  return `${value}%`;
}

function toUtcTimestamp(time: number): UTCTimestamp {
  const seconds = time > 10_000_000_000 ? Math.floor(time / 1000) : Math.floor(time);
  return seconds as UTCTimestamp;
}

function toCandles(points: PricePoint[]): Candle[] {
  const byTime = new Map<number, Candle>();
  const sorted = [...points].filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value)).sort((a, b) => a.time - b.time);

  sorted.forEach((point, index) => {
    const previous = sorted[index - 1];
    const close = point.close ?? point.value;
    const open = point.open ?? previous?.value ?? close;
    const high = point.high ?? Math.max(open, close);
    const low = point.low ?? Math.min(open, close);
    const time = toUtcTimestamp(point.time);

    byTime.set(Number(time), {
      time,
      open,
      high,
      low,
      close,
      volume: Math.max(0, point.volume ?? 0),
      ohlcSource: point.ohlcSource ?? "derived",
    });
  });

  return [...byTime.values()].sort((a, b) => Number(a.time) - Number(b.time));
}

function formatDate(time: Time | number) {
  if (typeof time === "number") {
    const millis = time > 10_000_000_000 ? time : time * 1000;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(millis));
  }

  if (typeof time === "string") {
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(`${time}T00:00:00Z`));
  }

  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "2-digit" }).format(new Date(Date.UTC(time.year, time.month - 1, time.day)));
}

function timeKey(time: Time) {
  if (typeof time === "object") return `${time.year}-${time.month}-${time.day}`;
  return String(time);
}

function isCandlestickData(data: unknown): data is CandlestickData<Time> {
  return Boolean(data && typeof data === "object" && "open" in data && "high" in data && "low" in data && "close" in data && "time" in data);
}

export default function UPlotChart({ points, storageKey }: { points: PricePoint[]; positive: boolean; storageKey?: string }) {
  const area = useRef<HTMLDivElement>(null);
  const chartHost = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [expanded, setExpanded] = useState(false);
  const [shapes, setShapes] = useState<DrawingShape[]>([]);
  const [draft, setDraft] = useState<DrawingShape | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const candles = useMemo(() => toCandles(points), [points]);
  const candleData = useMemo<CandlestickData<UTCTimestamp>[]>(() => candles.map((candle) => ({
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  })), [candles]);
  const volumeData = useMemo<HistogramData<UTCTimestamp>[]>(() => candles.map((candle) => ({
    time: candle.time,
    value: candle.volume,
    color: candle.close >= candle.open ? "rgba(85, 201, 149, .34)" : "rgba(241, 124, 120, .34)",
  })), [candles]);
  const candleLookup = useMemo(() => new Map(candles.map((candle) => [String(candle.time), candle])), [candles]);
  const isDrawing = activeTool !== "cursor";

  useEffect(() => {
    const host = chartHost.current;
    if (!host || !candleData.length) return;

    setHoveredCandle(null);

    const chart = createChart(host, {
      width: Math.max(320, host.clientWidth || 900),
      height: Math.max(expanded ? 520 : 430, host.clientHeight || 430),
      layout: {
        background: { type: ColorType.Solid, color: "#06101a" },
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        textColor: "#a8b4bf",
      },
      grid: {
        vertLines: { color: "rgba(177, 199, 214, .08)" },
        horzLines: { color: "rgba(177, 199, 214, .10)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(209, 180, 110, .42)", labelBackgroundColor: "#162230" },
        horzLine: { color: "rgba(209, 180, 110, .42)", labelBackgroundColor: "#162230" },
      },
      rightPriceScale: {
        borderColor: "rgba(177, 199, 214, .18)",
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: "rgba(177, 199, 214, .18)",
        barSpacing: candleData.length > 700 ? 3 : candleData.length > 260 ? 5 : 8,
        minBarSpacing: 2,
        rightOffset: 8,
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: "tr-TR",
        priceFormatter: (price: number) => numberFormat.format(price),
      },
      handleScale: true,
      handleScroll: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#55c995",
      downColor: "#f17c78",
      wickUpColor: "#55c995",
      wickDownColor: "#f17c78",
      borderUpColor: "#55c995",
      borderDownColor: "#f17c78",
      borderVisible: false,
      priceLineColor: "#d1b46e",
      priceLineWidth: 1,
      title: "OHLC",
    });
    candleSeries.setData(candleData);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
      base: 0,
    });
    volumeSeries.setData(volumeData);
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, borderVisible: false });

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const data = param.seriesData.get(candleSeries);
      if (!isCandlestickData(data)) {
        setHoveredCandle(null);
        return;
      }

      const candle = candleLookup.get(timeKey(data.time));
      setHoveredCandle(candle ?? {
        time: toUtcTimestamp(Number(data.time)),
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: 0,
        ohlcSource: "native",
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().fitContent();

    let frame = 0;
    const resize = () => {
      const width = Math.max(320, host.clientWidth || 900);
      const height = Math.max(expanded ? 520 : 430, host.clientHeight || 430);
      chart.resize(width, height);
    };
    const scheduleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    const observer = "ResizeObserver" in window ? new ResizeObserver(scheduleResize) : null;
    observer?.observe(host);
    window.addEventListener("resize", scheduleResize);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleResize);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, [candleData, candleLookup, expanded, volumeData]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as DrawingShape[];
        setShapes(Array.isArray(stored) ? stored.filter((item) => item && item.tool && typeof item.x1 === "number") : []);
      } catch {
        setShapes([]);
      }
    });
  }, [storageKey]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setActiveTool("cursor");
        setDraft(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const pointerPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - rect.left) / rect.width * 100),
      y: clamp((event.clientY - rect.top) / rect.height * 100),
    };
  };

  const chooseTool = (tool: DrawingTool) => {
    setActiveTool(tool);
    setDraft(null);
    if (tool !== "cursor") setExpanded(true);
  };

  const startShape = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPoint(event);
    const tool = activeTool as Exclude<DrawingTool, "cursor">;
    setDraft(normalizeShape({ id: `${tool}-${Date.now()}`, tool, x1: point.x, y1: point.y, x2: point.x, y2: point.y }));
  };

  const moveShape = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !draft) return;
    const point = pointerPoint(event);
    setDraft((current) => current ? normalizeShape({ ...current, x2: point.x, y2: point.y }) : current);
  };

  const finishShape = () => {
    if (!isDrawing || !draft) return;
    if (draft.tool === "horizontal" || draft.tool === "vertical" || distance(draft) > 1.2) setShapes((current) => [...current, draft]);
    setDraft(null);
  };

  const save = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(shapes));
    setSavedAt(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }));
  }, [shapes, storageKey]);

  const clear = () => {
    setShapes([]);
    setDraft(null);
    if (storageKey && typeof window !== "undefined") localStorage.removeItem(storageKey);
    setSavedAt("");
  };

  const undo = () => {
    setDraft(null);
    setShapes((current) => current.slice(0, -1));
  };

  const displayCandle = hoveredCandle && candleLookup.has(String(hoveredCandle.time)) ? hoveredCandle : candles.at(-1);
  const hasDerivedCandles = candles.some((candle) => candle.ohlcSource === "derived");

  return <div className={`chart-workspace pro-chart ${expanded ? "expanded" : ""}`}>
    <div className="pro-chart-topbar" aria-label="Grafik çalışma alanı">
      <div>
        <span className="eyebrow-label">TRADINGVIEW STİLİ MUM GRAFİK</span>
        <strong>{isDrawing ? tools.find((tool) => tool.id === activeTool)?.label : "Profesyonel OHLC görünümü"}</strong>
      </div>
      <div className="pro-chart-actions">
        <button type="button" onClick={() => setExpanded((value) => !value)} title={expanded ? "Normal görünüme dön" : "Grafiği büyüt"} aria-label={expanded ? "Normal görünüme dön" : "Grafiği büyüt"}><Maximize2 className="inline-icon" aria-hidden="true" /></button>
        <button type="button" onClick={undo} disabled={!shapes.length && !draft} title="Son çizimi geri al" aria-label="Son çizimi geri al"><Undo2 className="inline-icon" aria-hidden="true" /></button>
        <button type="button" onClick={save} disabled={!storageKey} title="Çizimleri kaydet" aria-label="Çizimleri kaydet"><Save className="inline-icon" aria-hidden="true" /></button>
        <button type="button" onClick={clear} disabled={!shapes.length && !draft} title="Tüm çizimleri temizle" aria-label="Tüm çizimleri temizle"><Eraser className="inline-icon" aria-hidden="true" /></button>
        {expanded && <button type="button" onClick={() => { setExpanded(false); setActiveTool("cursor"); setDraft(null); }} title="Kapat" aria-label="Kapat"><X className="inline-icon" aria-hidden="true" /></button>}
      </div>
    </div>
    <div className="pro-chart-shell">
      <aside className="pro-chart-tools" aria-label="Grafik çizim araçları">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return <button type="button" className={activeTool === tool.id ? "active" : ""} onClick={() => chooseTool(tool.id)} title={`${tool.label}: ${tool.hint}`} aria-label={tool.label} key={tool.id}><Icon className="inline-icon" aria-hidden="true" /><span>{tool.label}</span></button>;
        })}
      </aside>
      <div
        className={`chart-canvas-area ${isDrawing ? "drawing" : ""}`}
        ref={area}
        onPointerDown={startShape}
        onPointerMove={moveShape}
        onPointerUp={finishShape}
        onPointerCancel={finishShape}
      >
        <div className="tradingview-chart-host" ref={chartHost} />
        <svg className="chart-drawing-layer" aria-hidden="true">
          {[...shapes, ...(draft ? [draft] : [])].map((shape) => <DrawingSvg shape={shape} key={shape.id} />)}
        </svg>
        {displayCandle && <div className="chart-ohlc-strip">
          <span>{formatDate(displayCandle.time)}</span>
          <span>A {numberFormat.format(displayCandle.open)}</span>
          <span>Y {numberFormat.format(displayCandle.high)}</span>
          <span>D {numberFormat.format(displayCandle.low)}</span>
          <span>K {numberFormat.format(displayCandle.close)}</span>
          <span>H {compactFormat.format(displayCandle.volume)}</span>
        </div>}
        <div className="ohlc-badge">{hasDerivedCandles ? "Türetilmiş OHLC" : "OHLC"}</div>
        {isDrawing && <div className="chart-crosshair-hint"><Pencil className="inline-icon" aria-hidden="true" />Çizmek için grafiğe basılı tutup sürükle</div>}
      </div>
    </div>
    <div className="pro-chart-status">
      <span>{shapes.length} çizim</span>
      <span>{savedAt ? `Kaydedildi ${savedAt}` : "Kaydedilmemiş çalışma"}</span>
      <span>{expanded ? "Odak modu açık · ESC ile çık" : "Araç seçince grafik büyür"}</span>
    </div>
  </div>;
}

function DrawingSvg({ shape }: { shape: DrawingShape }) {
  if (shape.tool === "rectangle" || shape.tool === "measure") {
    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const width = Math.abs(shape.x2 - shape.x1);
    const height = Math.abs(shape.y2 - shape.y1);
    return <g className={`drawing-shape drawing-${shape.tool}`}>
      <rect x={pct(x)} y={pct(y)} width={pct(width)} height={pct(height)} />
      {shape.tool === "measure" && <text x={pct(x + Math.min(width, 3))} y={pct(Math.max(3, y - 1))}>{`${width.toFixed(1)}% / ${height.toFixed(1)}%`}</text>}
    </g>;
  }

  if (shape.tool === "fib") {
    const x1 = Math.min(shape.x1, shape.x2);
    const x2 = Math.max(shape.x1, shape.x2);
    const levels = [0, .236, .382, .5, .618, .786, 1];
    return <g className="drawing-shape drawing-fib">
      <rect x={pct(x1)} y={pct(Math.min(shape.y1, shape.y2))} width={pct(x2 - x1)} height={pct(Math.abs(shape.y2 - shape.y1))} />
      {levels.map((level) => {
        const y = shape.y1 + (shape.y2 - shape.y1) * level;
        return <g key={level}><line x1={pct(x1)} y1={pct(y)} x2={pct(x2)} y2={pct(y)} /><text x={pct(x2)} y={pct(y)}>{`${Math.round(level * 100)}%`}</text></g>;
      })}
    </g>;
  }

  return <g className={`drawing-shape drawing-${shape.tool}`}>
    <line x1={pct(shape.x1)} y1={pct(shape.y1)} x2={pct(shape.x2)} y2={pct(shape.y2)} />
    <circle cx={pct(shape.x1)} cy={pct(shape.y1)} r="3" />
    <circle cx={pct(shape.x2)} cy={pct(shape.y2)} r="3" />
  </g>;
}
