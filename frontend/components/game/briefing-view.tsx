"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, FileText, MapPin, PlayCircle, RotateCcw, Target, Users } from "lucide-react";
import { useGame } from "./game-provider";
import { AvailabilityBadge, DifficultyBadge, SessionStatusBadge } from "./labels";
import { Badge, Card, CardHeader, ErrorPanel, LoadingScreen } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { getCaseAvailability, getCaseById, getLockReason } from "@/lib/game/case-loader";
import { getKnownSuspects, isFinished } from "@/lib/game/selectors";
import { maxScore } from "@/lib/game/scoring";
import { t } from "@/lib/i18n";
import { formatDuration } from "@/lib/utils/format";

export function BriefingView({ caseId }: { caseId: string }) {
  const caseDef = getCaseById(caseId)!;
  const router = useRouter();
  const { ready, save, startNewSession, resetCase } = useGame();
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (!ready) return <LoadingScreen />;

  const availability = getCaseAvailability(save, caseDef);
  const session = save.sessions[caseDef.id];
  const inProgress = !!session && !isFinished(session);
  const suspects = getKnownSuspects(caseDef, {
    discoveredEvidenceIds: [],
    completedActionIds: [],
    visitedLocationIds: [caseDef.startingLocationId],
  });

  const begin = () => {
    startNewSession(caseDef.id);
    router.push(`/investigacao/${caseDef.slug}`);
  };

  return (
    <div className="space-y-6">
      <ButtonLink href="/casos" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />}>
        Arquivo de casos
      </ButtonLink>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">CASO {String(caseDef.order).padStart(2, "0")}</span>
          <AvailabilityBadge availability={availability} />
          <DifficultyBadge difficulty={caseDef.difficulty} />
          <Badge>{t(`category.${caseDef.category}`)}</Badge>
          {session && <SessionStatusBadge status={session.status} />}
        </div>
        <h1 className="text-3xl font-bold text-ink">{caseDef.title}</h1>
        <p className="flex items-center gap-1.5 text-ink-soft">
          <MapPin className="size-4" aria-hidden />
          {caseDef.origin}
        </p>
      </header>

      {availability === "bloqueado" && (
        <ErrorPanel title="Caso bloqueado" description={getLockReason(save, caseDef)} />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Relatório inicial" icon={<FileText className="size-4 text-accent" aria-hidden />} subtitle={caseDef.briefing.from} />
          <div className="space-y-3 p-4 text-ink-soft">
            {caseDef.briefing.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Objetivo" icon={<Target className="size-4 text-accent" aria-hidden />} />
            <div className="space-y-3 p-4 text-sm">
              <p className="text-ink">{caseDef.objective}</p>
              {caseDef.secondaryObjectives.length > 0 && (
                <div>
                  <p className="font-medium text-muted">Objetivos secundários</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
                    {caseDef.secondaryObjectives.map((o) => (
                      <li key={o.id}>{o.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3">
                <div>
                  <dt className="flex items-center gap-1 text-muted">
                    <Clock className="size-3.5" aria-hidden /> Tempo
                  </dt>
                  <dd className="font-medium text-ink">{formatDuration(caseDef.timeBudget)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Pontuação máxima</dt>
                  <dd className="font-medium text-ink">{maxScore(caseDef)} pts</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Suspeitos iniciais" icon={<Users className="size-4 text-accent" aria-hidden />} />
            <ul className="divide-y divide-line">
              {suspects.map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-muted">{s.occupation}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {availability !== "bloqueado" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {inProgress ? (
            <>
              <ButtonLink href={`/investigacao/${caseDef.slug}`} size="lg" icon={<PlayCircle className="size-5" aria-hidden />}>
                Continuar investigação
              </ButtonLink>
              <Button variant="secondary" size="lg" icon={<RotateCcw className="size-5" aria-hidden />} onClick={() => setConfirmRestart(true)}>
                Reiniciar caso
              </Button>
            </>
          ) : (
            <>
              <Button size="lg" icon={<PlayCircle className="size-5" aria-hidden />} onClick={begin}>
                {session ? "Jogar novamente" : "Iniciar investigação"}
              </Button>
              {session && (
                <ButtonLink href={`/relatorio/${caseDef.slug}`} variant="secondary" size="lg">
                  Ver último relatório
                </ButtonLink>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmRestart}
        title="Reiniciar este caso?"
        confirmLabel="Reiniciar"
        destructive
        onCancel={() => setConfirmRestart(false)}
        onConfirm={() => {
          setConfirmRestart(false);
          resetCase(caseDef.id);
          begin();
        }}
      >
        <p>Todo o progresso desta investigação será perdido. Suas estatísticas e melhores pontuações são mantidas.</p>
      </ConfirmDialog>
    </div>
  );
}
