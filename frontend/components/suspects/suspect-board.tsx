"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, UserX, Undo2 } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession } from "@/types/game";
import type { Suspect } from "@/types/suspect";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SuspectPortrait } from "./suspect-portrait";
import { SuspectStatusBadge } from "@/components/game/labels";
import {
  getEvidenceForSuspect,
  getKnownSuspects,
  getKnownTraits,
  getSuspectStatus,
  isFinished,
} from "@/lib/game/selectors";
import { cn } from "@/lib/utils/format";

export function SuspectBoard({
  caseDef,
  session,
  onToggleEliminated,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  onToggleEliminated: (id: string) => void;
}) {
  const suspects = getKnownSuspects(caseDef, session);
  if (suspects.length === 0) return <EmptyState title="Nenhum suspeito identificado ainda" />;
  return (
    <ul className="space-y-3">
      {suspects.map((s) => (
        <li key={s.id}>
          <SuspectCard caseDef={caseDef} session={session} suspect={s} onToggleEliminated={onToggleEliminated} />
        </li>
      ))}
    </ul>
  );
}

function SuspectCard({
  caseDef,
  session,
  suspect,
  onToggleEliminated,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  suspect: Suspect;
  onToggleEliminated: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getSuspectStatus(caseDef, session, suspect.id);
  const traits = getKnownTraits(suspect, session);
  const evidence = getEvidenceForSuspect(caseDef, session, suspect.id);
  const eliminated = status === "descartado";
  const unknownCount = Object.values(traits).filter((v) => v === null).length;
  const detailsId = `suspeito-${suspect.id}`;

  return (
    <article className={cn("rounded-lg border bg-surface-2", eliminated ? "border-line opacity-70" : "border-line-strong")}>
      <div className="flex gap-3 p-3">
        <SuspectPortrait name={suspect.name} hue={suspect.portraitHue} muted={eliminated} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn("font-semibold text-ink", eliminated && "line-through decoration-muted")}>{suspect.name}</h3>
            <SuspectStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted">
            {suspect.occupation} · {suspect.age} anos
          </p>
          <dl className="mt-2 flex flex-wrap gap-1.5">
            {caseDef.traits.map((trait) => {
              const value = traits[trait.key];
              const label = trait.options.find((o) => o.value === value)?.label;
              return (
                <div
                  key={trait.key}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
                  title={trait.question}
                >
                  <dt className="inline text-muted">{trait.label}: </dt>
                  <dd className={cn("inline font-medium", label ? "text-ink" : "text-muted italic")}>
                    {label ?? "desconhecido"}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between border-t border-line px-3 text-sm text-ink-soft hover:bg-surface-3"
      >
        Ficha completa
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
      </button>
      {expanded && (
        <div id={detailsId} className="space-y-3 border-t border-line p-3 text-sm animate-fade-in">
          <p className="text-ink-soft">{suspect.description}</p>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium text-muted">Histórico</dt>
              <dd className="text-ink">{suspect.background}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Álibi declarado</dt>
              <dd className="text-ink">
                {suspect.alibi}{" "}
                {session.confirmedAlibiIds.includes(suspect.id) ? (
                  <span className="font-medium text-info">(confirmado pela investigação)</span>
                ) : (
                  <span className="text-muted">(não verificado)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Possível motivo</dt>
              <dd className="text-ink">{suspect.motive}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted">Evidências que o(a) mencionam</dt>
              <dd>
                {evidence.length === 0 ? (
                  <span className="text-muted">Nenhuma até agora.</span>
                ) : (
                  <ul className="list-disc pl-5 text-ink">
                    {evidence.map((e) => (
                      <li key={e.id}>{e.title}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            {unknownCount > 0 && (
              <div className="flex items-start gap-2 text-muted">
                <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{unknownCount} característica(s) ainda desconhecida(s). Continue investigando.</span>
              </div>
            )}
          </dl>
          {!isFinished(session) && status !== "identificado" && (
            <Button
              size="sm"
              variant={eliminated ? "secondary" : "ghost"}
              icon={eliminated ? <Undo2 className="size-4" aria-hidden /> : <UserX className="size-4" aria-hidden />}
              onClick={() => onToggleEliminated(suspect.id)}
            >
              {eliminated ? "Voltar a investigar" : "Descartar suspeito"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
