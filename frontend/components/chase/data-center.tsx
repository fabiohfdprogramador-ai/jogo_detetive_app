"use client";

import { FileSignature } from "lucide-react";
import type { ChaseSession, TraitKey } from "@/types/chase";
import { ORGANIZATION, SUSPECTS, TRAITS, getChaseSuspect } from "@/data/world/suspects";
import { matchingSuspectIds } from "@/lib/chase/generator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/format";

/** Central de Dados: filtra a ficha da Rede Mariposa e emite o mandado de prisão. */
export function DataCenter({
  session,
  onFilter,
  onWarrant,
}: {
  session: ChaseSession;
  onFilter: (trait: TraitKey, value: string | null) => void;
  onWarrant: () => void;
}) {
  const matches = matchingSuspectIds(session.traitFilter);
  const warrant = session.warrantSuspectId ? getChaseSuspect(session.warrantSuspectId) : null;
  const finished = session.status !== "ativo";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-info/40 bg-info/5 p-3 font-mono text-xs text-info">
        &gt; CENTRAL DE DADOS MERIDIANO · arquivo {ORGANIZATION.emoji} {ORGANIZATION.name}
        <br />
        &gt; Selecione as características conhecidas do(a) suspeito(a).
      </div>

      {TRAITS.map((trait) => (
        <fieldset key={trait.key} disabled={finished}>
          <legend className="mb-1.5 text-sm font-medium text-ink">
            <span aria-hidden>{trait.emoji}</span> {trait.label}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {trait.options.map((o) => {
              const active = session.traitFilter[trait.key] === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  data-trait={trait.key}
                  data-value={o.value}
                  onClick={() => onFilter(trait.key, active ? null : o.value)}
                  className={cn(
                    "flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-sm transition-colors",
                    active ? "border-accent bg-accent/15 font-medium text-accent" : "border-line text-ink-soft hover:bg-surface-2",
                  )}
                >
                  <span aria-hidden>{o.emoji}</span>
                  {o.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <section aria-live="polite">
        <h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          Suspeitos compatíveis: {matches.length}
        </h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUSPECTS.map((s) => {
            const match = matches.includes(s.id);
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 text-sm transition-opacity",
                  match ? "border-line-strong bg-surface-2" : "border-transparent opacity-30",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md text-xl" style={{ background: `hsl(${s.hue} 35% 22%)` }} aria-hidden>
                  {s.emoji}
                </span>
                <span className={cn("leading-tight", match ? "text-ink" : "text-muted line-through")}>{s.name}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {warrant && (
        <p className="rounded-lg border border-ok/50 bg-ok/10 p-3 text-sm text-ok">
          📜 Mandado de prisão ativo contra <strong>{warrant.name}</strong>.
        </p>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={finished || matches.length !== 1 || session.warrantSuspectId === matches[0]}
        icon={<FileSignature className="size-5" aria-hidden />}
        onClick={onWarrant}
      >
        {matches.length === 1 ? `Emitir mandado contra ${getChaseSuspect(matches[0]!)!.name}` : "Refine até restar 1 suspeito"}
      </Button>
      <p className="text-xs text-muted">
        Sem mandado, você não pode prender ninguém. Com o mandado errado, o verdadeiro culpado escapa.
      </p>
    </div>
  );
}
