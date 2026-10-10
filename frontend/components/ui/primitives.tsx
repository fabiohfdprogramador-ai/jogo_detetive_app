import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, FolderSearch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/format";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-line-strong bg-surface-2 text-ink-soft",
  accent: "border-accent/50 bg-accent/10 text-accent",
  ok: "border-ok/50 bg-ok/10 text-ok",
  warn: "border-warn/50 bg-warn/10 text-warn",
  danger: "border-danger/50 bg-danger/10 text-danger",
  info: "border-info/50 bg-info/10 text-info",
};

/** Etiqueta de estado. Sempre acompanha texto (e opcionalmente ícone), nunca só cor. */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-line bg-surface", className)} {...props} />;
}

export function CardHeader({
  title,
  icon,
  actions,
  subtitle,
}: {
  title: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink uppercase">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function ProgressBar({
  value,
  max = 1,
  tone = "accent",
  label,
}: {
  value: number;
  max?: number;
  tone?: "accent" | "ok" | "warn" | "danger";
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const color = { accent: "bg-accent", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="text-muted">{icon ?? <FolderSearch className="size-8" aria-hidden />}</div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingScreen({ message = "Carregando arquivos da agência…" }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Loader2 className="size-8 animate-spin text-accent" aria-hidden />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorPanel({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-4">
      <p className="flex items-center gap-2 font-semibold text-danger">
        <AlertTriangle className="size-5" aria-hidden />
        {title}
      </p>
      {description && <div className="mt-1 text-sm text-ink-soft">{description}</div>}
      {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-xs font-semibold tracking-[0.14em] text-muted uppercase", className)}>{children}</h2>;
}
