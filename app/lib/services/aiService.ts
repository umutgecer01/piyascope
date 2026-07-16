import type { AIAnalysis } from "../types";

export type AnalyzeRequest = { question: string; assetSymbol?: string; newsId?: string };

export const aiService = {
  async analyze(request: AnalyzeRequest): Promise<AIAnalysis> {
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json() as AIAnalysis & { error?: string };
    if (!response.ok) throw new Error(payload.error || `Analiz servisi ${response.status} yanıtı verdi.`);
    return payload;
  },
};
