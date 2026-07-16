"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Moon, Search, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AppProviders, useTheme } from "./Providers";
import GlobalSearch from "./GlobalSearch";
import MarketTicker from "./MarketTicker";
import { Drawer, Tooltip } from "./ui/overlays";

const navTr = [
  ["Ana Sayfa", "/"], ["Haberler", "/haberler"], ["Piyasalar", "/piyasalar"], ["Ekonomik Takvim", "/ekonomik-takvim"], ["AI Analist", "/ai-analist"], ["Kaynaklar", "/kaynaklar"],
] as const;

const navEn = [
  ["Home", "/en"], ["News", "/en/news-radar"], ["Markets", "/en/markets"], ["Agenda", "/en/agenda"], ["Sources", "/en/sources"],
] as const;

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/en") ? "en" : "tr";
  const nav = locale === "en" ? navEn : navTr;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  const languageHref = locale === "en" ? "/" : "/en";
  const isEnglish = locale === "en";

  return <>
    <a className="skip-link" href="#main-content">{isEnglish ? "Skip to content" : "İçeriğe geç"}</a>
    <header className="app-header">
      <div className="header-inner">
        <Link className="app-wordmark" href={isEnglish ? "/en" : "/"} aria-label={isEnglish ? "Piyascope home" : "Piyascope ana sayfa"}>
          <span className="wordmark-icon">P</span>
          <span><b>PIYASCOPE</b><small>{isEnglish ? "See the data. Understand the impact." : "Veriyi gör. Etkiyi anla."}</small></span>
        </Link>
        <nav className="desktop-nav" aria-label={isEnglish ? "Main menu" : "Ana menü"}>
          {nav.map(([label, href]) => <Link className={pathname === href || (href !== "/" && pathname?.startsWith(href)) ? "active" : ""} href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="header-tools">
          <button className="search-trigger" type="button" onClick={() => setSearchOpen(true)} aria-label={isEnglish ? "Open global search" : "Global aramayı aç"}>
            <Search className="inline-icon" aria-hidden="true" /><b>{isEnglish ? "Search" : "Ara"}</b><kbd>Ctrl K</kbd>
          </button>
          <Tooltip label={theme === "dark" ? (isEnglish ? "Switch to light theme" : "Açık temaya geç") : (isEnglish ? "Switch to dark theme" : "Koyu temaya geç")}>
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? (isEnglish ? "Switch to light theme" : "Açık temaya geç") : (isEnglish ? "Switch to dark theme" : "Koyu temaya geç")}>
              {theme === "dark" ? <Sun className="inline-icon" aria-hidden="true" /> : <Moon className="inline-icon" aria-hidden="true" />}
            </button>
          </Tooltip>
          <Link className="language-link" href={languageHref}>{isEnglish ? "TR" : "EN"}</Link>
          <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label={isEnglish ? "Open menu" : "Menüyü aç"} aria-expanded={menuOpen}>
            <Menu className="inline-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      <MarketTicker />
    </header>
    <main id="main-content" className="app-main">{children}</main>
    <footer className="app-footer">
      <div className="page-container">
        <div>
          <Link className="app-wordmark footer-brand" href={isEnglish ? "/en" : "/"}>
            <span className="wordmark-icon">P</span><span><b>PIYASCOPE</b><small>{isEnglish ? "See the data. Understand the impact." : "Veriyi gör. Etkiyi anla."}</small></span>
          </Link>
          <p>{isEnglish ? "A focused workspace for market data, financial news and source-aware analysis." : "Ekonomi haberleri, piyasa verileri ve kaynaklı analiz için sade çalışma alanı."}</p>
        </div>
        <div><b>Platform</b><Link href={isEnglish ? "/en/news-radar" : "/haberler"}>{isEnglish ? "News" : "Haberler"}</Link><Link href={isEnglish ? "/en/markets" : "/piyasalar"}>{isEnglish ? "Markets" : "Piyasalar"}</Link><Link href="/ai-analist">AI Analist</Link></div>
        <div><b>{isEnglish ? "Personal" : "Kişisel"}</b><Link href="/takip-listem">{isEnglish ? "Watchlist" : "Takip Listem"}</Link><Link href="/alarmlar">{isEnglish ? "Alerts" : "Alarmlar"}</Link><Link href="/ozet/sabah">{isEnglish ? "Morning Brief" : "Sabah Özeti"}</Link></div>
        <div><b>{isEnglish ? "Trust" : "Kurumsal"}</b><Link href={isEnglish ? "/en/sources" : "/kaynaklar"}>{isEnglish ? "Sources" : "Kaynaklar"}</Link><Link href="/hakkimizda">{isEnglish ? "About" : "Hakkımızda"}</Link></div>
        <small>© 2026 Piyascope · {isEnglish ? "For information only; not investment advice." : "Bu platform bilgilendirme amaçlıdır; yatırım tavsiyesi sunmaz."}</small>
      </div>
    </footer>
    <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={isEnglish ? "Piyascope menu" : "Piyascope menü"}>
      <nav className="mobile-nav">
        {nav.map(([label, href]) => <Link href={href} onClick={() => setMenuOpen(false)} key={href}>{label}<ArrowRight className="inline-icon" aria-hidden="true" /></Link>)}
        <hr />
        <Link href="/takip-listem" onClick={() => setMenuOpen(false)}>{isEnglish ? "Watchlist" : "Takip Listem"}<ArrowRight className="inline-icon" aria-hidden="true" /></Link>
        <Link href="/alarmlar" onClick={() => setMenuOpen(false)}>{isEnglish ? "Price Alerts" : "Fiyat Alarmları"}<ArrowRight className="inline-icon" aria-hidden="true" /></Link>
      </nav>
    </Drawer>
    <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} locale={locale} />
  </>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return <AppProviders><ShellInner>{children}</ShellInner></AppProviders>;
}
