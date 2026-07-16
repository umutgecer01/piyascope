"use client";

import { useEffect, useRef, type ReactNode } from "react";

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.querySelector<HTMLElement>("button, input, a, [tabindex='0']")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex='0']")].filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose(): void; title: string; children: ReactNode }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return <div className="overlay-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="ui-modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Pencereyi kapat">×</button></header>{children}</div></div>;
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose(): void; title: string; children: ReactNode }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return <div className="overlay-backdrop drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="ui-drawer" ref={ref} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><header><h2 id="drawer-title">{title}</h2><button type="button" onClick={onClose} aria-label="Menüyü kapat">×</button></header>{children}</aside></div>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="tooltip-wrap" data-tooltip={label}>{children}</span>;
}
