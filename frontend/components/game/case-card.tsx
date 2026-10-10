"use client";

import { Lock, MapPin, Trophy } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { CaseAvailability, CaseRecord } from "@/types/game";
import { Badge, Card } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { AvailabilityBadge, DifficultyBadge } from "./labels";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils/format";

export function CaseCard({
  caseDef,
  availability,
  record,
  lockReason,
}: {
  caseDef: CaseDefinition;
  availability: CaseAvailability;
  record?: CaseRecord;
  lockReason?: string | null;
}) {
  const locked = availability === "bloqueado";
  const cta =
    availability === "em_andamento" ? "Continuar" : availability === "concluido" ? "Rever ou jogar de novo" : "Abrir dossiê";
  return (
    <Card className={cn("flex flex-col overflow-hidden", locked && "opacity-75")}>
      <div className="grid-paper relative border-b border-line px-4 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">CASO {String(caseDef.order).padStart(2, "0")}</span>
          <AvailabilityBadge availability={availability} />
        </div>
        <h3 className="mt-2 text-lg font-semibold text-ink">{caseDef.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <MapPin className="size-3.5" aria-hidden />
          {caseDef.origin}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm text-ink-soft">{caseDef.synopsis}</p>
        <div className="flex flex-wrap gap-2">
          <DifficultyBadge difficulty={caseDef.difficulty} />
          <Badge>{t(`category.${caseDef.category}`)}</Badge>
          <Badge tone="accent" icon={<Trophy className="size-3.5" aria-hidden />}>
            até {caseDef.rewardPoints} pts
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-muted">Melhor pontuação</dt>
            <dd className="font-medium text-ink">{record && record.finishedRuns > 0 ? record.bestScore : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Tentativas</dt>
            <dd className="font-medium text-ink">{record?.attempts ?? 0}</dd>
          </div>
        </dl>
        <div className="mt-auto pt-1">
          {locked ? (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-soft">
              <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              {lockReason}
            </p>
          ) : (
            <ButtonLink
              href={`/casos/${caseDef.slug}`}
              variant={availability === "em_andamento" ? "primary" : "secondary"}
              className="w-full"
            >
              {cta}
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}
