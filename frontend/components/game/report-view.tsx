"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, Eye, FileSearch, RotateCcw, Search, XCircle } from "lucide-react";
import { useGame } from "./game-provider";
import { SessionStatusBadge } from "./labels";
import { SuspectPortrait } from "@/components/suspects/suspect-portrait";
import { Badge, Card, CardHeader, EmptyState, LoadingScreen, ProgressBar } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { getCaseAvailability, getCaseById, listCases } from "@/lib/game/case-loader";
import { getEvidence, getSuspect, isFinished } from "@/lib/game/selectors";
import { calculateScore, isSecondaryObjectiveMet } from "@/lib/game/scoring";
import { t } from "@/lib/i18n";
import { cn, formatDuration } from "@/lib/utils/format";

export function ReportView({ caseId }: { caseId: string }) {
  const caseDef = getCaseById(caseId)!;
  const router = useRouter();
  const { ready, save, startNewSession, resetCase } = useGame();
  const [revealSolution, setRevealSolution] = useState(false);
  const [confirmReplay, setConfirmReplay] = useState(false);

  if (!ready) return <LoadingScreen />;
  const session = save.sessions[caseDef.id];

  if (!session) {
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          title="Nenhum relatório disponível"
          description="Este caso ainda não foi investigado."
          action={<ButtonLink href={`/casos/${caseDef.slug}`}>Abrir dossiê</ButtonLink>}
        />
      </Card>
    );
  }

  const finished = isFinished(session);
  const score = calculateScore(caseDef, session);
  const identified = session.warrant.status === "autorizado";
  const culprit = getSuspect(caseDef, caseDef.solution.culpritId)!;
  const timeUsed = caseDef.timeBudget - Math.max(0, session.remainingTime);
  const supporting = [...new Set([...caseDef.solution.requiredEvidenceIds, ...caseDef.solution.supportingEvidenceIds])];
  const missed = caseDef.evidence.filter(
    (e) => (e.relevance === "chave" || e.relevance === "relevante") && !session.discoveredEvidenceIds.includes(e.id),
  );
  const decisions = session.actionHistory.filter((e) => e.type === "mandado" || e.type === "captura" || e.outcome === "falha");
  const ending =
    session.status === "concluido"
      ? caseDef.endings.success
      : session.status === "parcial"
        ? caseDef.endings.partial
        : session.status === "fracasso"
          ? caseDef.endings.failure
          : null;
  const next = listCases().find(
    (c) => c.order > caseDef.order && getCaseAvailability(save, c) !== "bloqueado",
  );
  const canSeeSolution = identified || (finished && revealSolution);

  const replay = () => {
    resetCase(caseDef.id);
    startNewSession(caseDef.id);
    router.push(`/investigacao/${caseDef.slug}`);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Relatório de investigação</p>
        <h1 className="text-3xl font-bold text-ink">{caseDef.title}</h1>
        <div className="flex flex-wrap gap-2">
          <SessionStatusBadge status={session.status} />
          <Badge tone={score.rating === "elite" ? "accent" : score.rating === "inconclusivo" ? "neutral" : "ok"} icon={<Award className="size-3.5" aria-hidden />}>
            {t(`rating.${score.rating}`)}
          </Badge>
        </div>
      </header>

      {!finished && (
        <Card className="border-info/50 p-4 text-sm text-ink-soft">
          Esta investigação ainda está em andamento. O relatório abaixo é parcial e será finalizado quando o caso for
          encerrado.
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Desfecho" icon={<FileSearch className="size-4 text-accent" aria-hidden />} />
          <div className="space-y-4 p-4">
            {ending ? <p className="text-lg text-ink">{ending}</p> : <p className="text-muted">Desfecho pendente.</p>}
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
              {identified ? (
                <>
                  <SuspectPortrait name={culprit.name} hue={culprit.portraitHue} />
                  <div>
                    <p className="text-sm text-muted">Responsável identificado</p>
                    <p className="font-semibold text-ink">{culprit.name}</p>
                    <p className="text-sm text-ink-soft">{culprit.occupation}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-soft">O responsável não foi identificado nesta investigação.</p>
              )}
            </div>
            {canSeeSolution ? (
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Como o caso se resolve</p>
                <p className="mt-1 text-ink-soft">{caseDef.solution.explanation}</p>
              </div>
            ) : (
              finished && (
                <Button variant="secondary" size="sm" icon={<Eye className="size-4" aria-hidden />} onClick={() => setRevealSolution(true)}>
                  Revelar a solução (spoiler)
                </Button>
              )
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Pontuação" icon={<Award className="size-4 text-accent" aria-hidden />} />
          <div className="space-y-3 p-4">
            <p className="text-4xl font-bold text-ink">
              {score.total}
              <span className="text-base font-medium text-muted"> / {score.max}</span>
            </p>
            <ProgressBar value={score.total} max={score.max} label="Pontuação obtida" />
            <table className="w-full text-sm">
              <caption className="sr-only">Composição da pontuação</caption>
              <tbody>
                {score.lines.map((line, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-soft">
                      {line.label}
                      {line.detail && <span className="block text-xs text-muted">{line.detail}</span>}
                    </th>
                    <td className={cn("py-1.5 text-right font-mono", line.points < 0 ? "text-danger" : "text-ink")}>
                      {line.points > 0 ? `+${line.points}` : line.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
              <div>
                <dt className="text-muted">Tempo usado</dt>
                <dd className="text-ink">{formatDuration(timeUsed)}</dd>
              </div>
              <div>
                <dt className="text-muted">Dicas</dt>
                <dd className="text-ink">{session.hintsUsed}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Evidências que sustentam a conclusão" icon={<Search className="size-4 text-accent" aria-hidden />} />
          <ul className="divide-y divide-line">
            {supporting.map((id) => {
              const e = getEvidence(caseDef, id)!;
              const found = session.discoveredEvidenceIds.includes(id);
              const visible = found || canSeeSolution;
              return (
                <li key={id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  {found ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Encontrada" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Não encontrada" />
                  )}
                  <span className={found ? "text-ink" : "text-muted"}>
                    {visible ? e.title : "Evidência não encontrada"}
                    {caseDef.solution.requiredEvidenceIds.includes(id) && (
                      <Badge tone="accent" className="ml-2">
                        Obrigatória
                      </Badge>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Decisões e penalidades" />
          <div className="space-y-4 p-4 text-sm">
            {decisions.length === 0 ? (
              <p className="text-muted">Nenhuma decisão crítica registrada.</p>
            ) : (
              <ul className="space-y-1.5">
                {decisions.map((d) => (
                  <li key={d.id} className="flex items-start gap-2">
                    {d.outcome === "sucesso" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Correta" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Incorreta" />
                    )}
                    <span className="text-ink">
                      {d.label}
                      {d.detail ? ` — ${d.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <p className="font-medium text-muted">Objetivos secundários</p>
              <ul className="mt-1 space-y-1">
                {caseDef.secondaryObjectives.map((o) => {
                  const met = isSecondaryObjectiveMet(caseDef, session, o.id);
                  return (
                    <li key={o.id} className="flex items-start gap-2">
                      {met ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Cumprido" />
                      ) : (
                        <XCircle className="mt-0.5 size-4 shrink-0 text-muted" aria-label="Não cumprido" />
                      )}
                      <span className={met ? "text-ink" : "text-muted"}>{o.description}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="font-medium text-muted">Pistas importantes ignoradas</p>
              {missed.length === 0 ? (
                <p className="text-ink">Nenhuma. Você encontrou todas as pistas relevantes.</p>
              ) : (
                <p className="text-ink">
                  {missed.length} pista(s) relevante(s) não encontrada(s)
                  {finished && canSeeSolution ? `: ${missed.map((e) => e.title).join("; ")}.` : "."}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/investigacao/${caseDef.slug}`} variant="secondary" size="lg" icon={<Eye className="size-5" aria-hidden />}>
          {finished ? "Revisar caso" : "Voltar à investigação"}
        </ButtonLink>
        {finished && (
          <Button variant="secondary" size="lg" icon={<RotateCcw className="size-5" aria-hidden />} onClick={() => setConfirmReplay(true)}>
            Jogar novamente
          </Button>
        )}
        <ButtonLink href={next ? `/casos/${next.slug}` : "/casos"} size="lg">
          {next ? `Continuar campanha: ${next.title}` : "Arquivo de casos"}
        </ButtonLink>
      </div>

      <ConfirmDialog
        open={confirmReplay}
        title="Jogar este caso novamente?"
        confirmLabel="Recomeçar"
        onCancel={() => setConfirmReplay(false)}
        onConfirm={() => {
          setConfirmReplay(false);
          replay();
        }}
      >
        <p>Uma nova investigação será iniciada. Sua melhor pontuação continua registrada.</p>
      </ConfirmDialog>
    </div>
  );
}
