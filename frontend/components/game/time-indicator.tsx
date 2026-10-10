import { Clock } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession } from "@/types/game";
import { ProgressBar } from "@/components/ui/primitives";
import { elapsedMinutes } from "@/lib/game/selectors";
import { formatDuration, formatGameClock } from "@/lib/utils/format";

export function TimeIndicator({ caseDef, session }: { caseDef: CaseDefinition; session: GameSession }) {
  const ratio = session.remainingTime / caseDef.timeBudget;
  const tone = ratio > 0.5 ? "ok" : ratio > 0.2 ? "warn" : "danger";
  const label = ratio > 0.5 ? "Tempo confortável" : ratio > 0.2 ? "Tempo apertado" : "Tempo crítico";
  return (
    <div className="min-w-[12rem] space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-1.5 font-mono text-ink">
          <Clock className="size-4 text-muted" aria-hidden />
          {formatGameClock(caseDef.clockStart, elapsedMinutes(caseDef, session))}
        </span>
        <span className="font-medium text-ink-soft">
          <span className="sr-only">Tempo restante: </span>
          {formatDuration(session.remainingTime)} <span className="text-muted">restantes</span>
        </span>
      </div>
      <ProgressBar value={session.remainingTime} max={caseDef.timeBudget} tone={tone} label={`${label}: tempo restante`} />
    </div>
  );
}
