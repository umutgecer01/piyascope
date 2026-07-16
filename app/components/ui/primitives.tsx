"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { INVESTMENT_DISCLAIMER } from "../../lib/types";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-container ${className}`}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="section-header">
      <div>{eyebrow && <span className="eyebrow-label">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action && <div className="section-action">{action}</div>}
    </header>
  );
}

export function Badge({ children, tone = "neutral", title }: { children: ReactNode; tone?: "neutral" | "positive" | "negative" | "warning" | "accent"; title?: string }) {
  return <span className={`ui-badge badge-${tone}`} title={title}>{children}</span>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={`ui-button button-${variant} button-${size} ${className}`} {...props} />;
}

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: ButtonProps["variant"]; className?: string }) {
  return <Link className={`ui-button button-${variant} button-md ${className}`} href={href}>{children}</Link>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function SearchBox({ value, onChange, placeholder = "Ara", label = "Ara" }: { value: string; onChange(value: string): void; placeholder?: string; label?: string }) {
  return <label className="ui-search"><span aria-hidden="true">⌕</span><span className="sr-only">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function Tabs({ items, value, onChange, label }: { items: string[]; value: string; onChange(value: string): void; label: string }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{items.map((item) => <button type="button" role="tab" aria-selected={value === item} className={value === item ? "active" : ""} onClick={() => onChange(item)} key={item}>{item}</button>)}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`ui-skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ui-state empty-state-pro"><span className="state-icon" aria-hidden="true">◇</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ title = "Bir sorun oluştu", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <div className="ui-state error-state-pro" role="alert"><span className="state-icon" aria-hidden="true">!</span><h3>{title}</h3><p>{description}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Tekrar dene</Button>}</div>;
}

export function Disclaimer({ children = INVESTMENT_DISCLAIMER, compact = false }: { children?: ReactNode; compact?: boolean }) {
  return <aside className={`disclaimer ${compact ? "compact" : ""}`}><span aria-hidden="true">i</span><p>{children}</p></aside>;
}
