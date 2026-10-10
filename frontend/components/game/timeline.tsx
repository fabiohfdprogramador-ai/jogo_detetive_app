import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession } from "@/types/game";
import { EmptyState } from "@/components/ui/primitives";
import { getLocation } from "@/lib/game/selectors";
import { formatDuration, formatGameClock } from "@/lib/utils/format";

export function Timeline({ caseDef, session }: { caseDef: CaseDefinition; session: GameSession }) {
  const entries = [...session.actionHistory].reverse();
  if (entries.length === 0) return <EmptyState title="Nenhum registro ainda" />;
  return (
    <ol className="relative space-y-3 border-l border-line-strong pl-5" aria-label="Linha do tempo da investigação">
      {entries.map((entry) => {
        const Icon = entry.outcome === "sucesso" ? CheckCircle2 : entry.outcome === "falha" ? XCircle : Circle;
        const color = entry.outcome === "sucesso" ? "text-ok" : entry.outcome === "falha" ? "text-danger" : "text-muted";
        return (
          <li key={entry.id} className="relative">
            <Icon className={`absolute top-0.5 -left-[1.72rem] size-4 rounded-full bg-surface ${color}`} aria-hidden />
            <p className="font-mono text-xs text-muted">
              {formatGameClock(caseDef.clockStart, entry.at)}
              {entry.timeCost > 0 && ` · ${formatDuration(entry.timeCost)}`}
            </p>
            <p className="text-sm text-ink">
              {entry.outcome === "falha" && <span className="sr-only">Falha: </span>}
              {entry.label}
            </p>
            <p className="text-xs text-muted">
              {getLocation(caseDef, entry.locationId)?.name}
              {entry.detail ? ` · ${entry.detail}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
