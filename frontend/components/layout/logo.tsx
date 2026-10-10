import { cn } from "@/lib/utils/format";

/** Logotipo original: um rastro de três pegadas convergindo para um ponto de mira. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="#15223a" stroke="#34486d" />
      <circle cx="27" cy="13" r="6.5" fill="none" stroke="#f2b544" strokeWidth="2" />
      <path d="M27 4.5v3.5M27 18v3.5M18.5 13H22M32 13h3.5" stroke="#f2b544" strokeWidth="2" strokeLinecap="round" />
      <circle cx="27" cy="13" r="1.6" fill="#f2b544" />
      <ellipse cx="9.5" cy="31" rx="2.3" ry="3.2" transform="rotate(-35 9.5 31)" fill="#b7c2d6" />
      <ellipse cx="15" cy="25.5" rx="2.1" ry="2.9" transform="rotate(-35 15 25.5)" fill="#b7c2d6" opacity="0.75" />
      <ellipse cx="19.8" cy="20.5" rx="1.8" ry="2.5" transform="rotate(-35 19.8 20.5)" fill="#b7c2d6" opacity="0.5" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-lg font-bold tracking-[0.18em] text-ink">RASTRO</span>
          <span className="block text-[11px] tracking-[0.12em] text-muted uppercase">Agência Meridiano</span>
        </span>
      )}
    </span>
  );
}
