import type { ChaseSession } from "@/types/chase";
import { getCity } from "@/data/world/cities";
import { formatChaseClock } from "@/lib/chase/engine";
import { EmptyState } from "@/components/ui/primitives";
import { Flag } from "./flag";
import { cn } from "@/lib/utils/format";

const KIND_STYLE = {
  destino: { icon: "🧭", className: "text-ink" },
  suspeito: { icon: "🕵️", className: "text-accent" },
  aviso: { icon: "⚠️", className: "text-warn" },
  nada: { icon: "🤷", className: "text-muted" },
} as const;

/** Caderno do agente: pistas por cidade e diário da missão. */
export function Notebook({ session }: { session: ChaseSession }) {
  const byCity = new Map<string, typeof session.notes>();
  for (const note of session.notes) byCity.set(note.cityId, [...(byCity.get(note.cityId) ?? []), note]);
  const suspectNotes = session.notes.filter((n) => n.kind === "suspeito");

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">🕵️ Sobre o(a) suspeito(a)</h3>
        {suspectNotes.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma característica anotada ainda. As testemunhas às vezes descrevem quem viram.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {suspectNotes.map((n, i) => (
              <li key={i} className="rounded-md bg-accent/10 px-2 py-1 text-accent">
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">🗒️ Pistas por cidade</h3>
        {byCity.size === 0 ? (
          <EmptyState title="Caderno vazio" description="Investigue os lugares da cidade para anotar pistas." />
        ) : (
          <ul className="space-y-3">
            {[...byCity.entries()].reverse().map(([cityId, notes]) => {
              const city = getCity(cityId)!;
              return (
                <li key={cityId} className="rounded-lg border border-line bg-surface-2 p-3">
                  <p className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
                    <Flag code={city.countryCode} country={city.country} />
                    {city.name}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {notes.map((n, i) => (
                      <li key={i} className={cn("flex gap-2", KIND_STYLE[n.kind].className)}>
                        <span aria-hidden>{KIND_STYLE[n.kind].icon}</span>
                        <span>{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">📅 Diário da missão</h3>
        <ol className="space-y-1.5 text-sm">
          {[...session.log].reverse().map((entry, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-24 shrink-0 font-mono text-xs leading-5 text-muted">{formatChaseClock(entry.hour, true)}</span>
              <span aria-hidden>{entry.emoji}</span>
              <span className="text-ink-soft">{entry.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
