"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/format";

export type ToastTone = "sucesso" | "info" | "alerta" | "erro";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

const toneStyles: Record<ToastTone, { className: string; icon: ReactNode; label: string }> = {
  sucesso: { className: "border-ok/60", icon: <CheckCircle2 className="size-5 text-ok" aria-hidden />, label: "Sucesso" },
  info: { className: "border-info/60", icon: <Info className="size-5 text-info" aria-hidden />, label: "Informação" },
  alerta: { className: "border-warn/60", icon: <AlertTriangle className="size-5 text-warn" aria-hidden />, label: "Atenção" },
  erro: { className: "border-danger/60", icon: <XCircle className="size-5 text-danger" aria-hidden />, label: "Erro" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => {
      if (!message) return;
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "erro" ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end"
      >
        {items.map((item) => {
          const style = toneStyles[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-2 px-4 py-3 text-sm shadow-xl animate-fade-in",
                style.className,
              )}
            >
              {style.icon}
              <p className="flex-1 text-ink">
                <span className="sr-only">{style.label}: </span>
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-m-1 rounded p-1 text-muted hover:text-ink"
                aria-label="Fechar notificação"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de ToastProvider");
  return ctx;
}
