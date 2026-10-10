"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/format";

/**
 * Janela modal acessível: foco preso dentro da janela, Esc fecha, foco devolvido ao
 * elemento que a abriu.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissible?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (focusables()[0] ?? panel)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, dismissible]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-hidden
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line-strong bg-surface shadow-2xl animate-fade-in sm:rounded-2xl",
          { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" }[size],
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-m-2 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden />
            </button>
          )}
        </header>
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
