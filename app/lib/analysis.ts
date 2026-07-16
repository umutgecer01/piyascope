import type { NewsArticle } from "./types";

const positiveWords = ["artış", "yükseliş", "büyüme", "güçlü", "iyileşme", "rekor", "kazanç", "olumlu", "indirim", "yatırım", "increase", "growth", "gain", "strong", "improve", "record"];
const negativeWords = ["düşüş", "kayıp", "daralma", "risk", "kriz", "zayıf", "gerileme", "enflasyon", "işsizlik", "kısıtlama", "decrease", "loss", "risk", "weak", "decline", "inflation"];

export function calculateNewsSentiment(news: NewsArticle[]) {
  if (!news.length) {
    return { positive: 0, neutral: 0, negative: 0, tone: "Canlı haber akışı bekleniyor.", updatedAt: "", sampleSize: 0 };
  }
  const counts = news.reduce((result, article) => {
    const text = `${article.title} ${article.summary}`.toLocaleLowerCase("tr-TR");
    const score = positiveWords.filter((word) => text.includes(word)).length - negativeWords.filter((word) => text.includes(word)).length;
    if (score > 0) result.positive += 1;
    else if (score < 0) result.negative += 1;
    else result.neutral += 1;
    return result;
  }, { positive: 0, neutral: 0, negative: 0 });
  const total = news.length;
  const positive = Math.round(counts.positive / total * 100);
  const negative = Math.round(counts.negative / total * 100);
  const neutral = 100 - positive - negative;
  const tone = positive - negative > 8 ? "Akışın tonu pozitif ağırlıklı." : negative - positive > 8 ? "Akışın tonu negatif ağırlıklı." : "Akışın tonu dengeli.";
  const updatedAt = news.map((article) => article.publishedAt).sort().at(-1) ?? "";
  return { positive, neutral, negative, tone, updatedAt, sampleSize: news.length };
}
