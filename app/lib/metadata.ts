import type { Metadata } from "next";

export function createMetadata(title: string, description: string, path: string, languages?: Record<string, string>): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path, ...(languages ? { languages } : {}) },
    openGraph: { type: "website", title: `${title} — Piyascope`, description, url: path, siteName: "Piyascope" },
    twitter: { card: "summary_large_image", title: `${title} — Piyascope`, description },
  };
}
