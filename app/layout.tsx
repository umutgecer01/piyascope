import type { Metadata } from "next";
import "./globals.css";
import "./platform.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://finans-akis.umutgecer02.chatgpt.site"),
  title: { default: "Piyascope — Veriyi gör. Etkiyi anla.", template: "%s — Piyascope" },
  description: "Ekonomi haberlerini, piyasa verilerini ve yapay zekâ destekli analizleri tek ekranda takip edin.",
  alternates: { canonical: "/", languages: { "tr-TR": "/", "en": "/en" } },
  openGraph: { type: "website", siteName: "Piyascope", title: "Piyascope — Veriyi gör. Etkiyi anla.", description: "Ekonomi haberleri, piyasa verileri ve kaynaklı analiz için modern finans platformu.", url: "/" },
  twitter: { card: "summary_large_image", title: "Piyascope", description: "Veriyi gör. Etkiyi anla." },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('piyascope.theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){document.documentElement.dataset.theme='dark'}})()` }} />
      </head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
