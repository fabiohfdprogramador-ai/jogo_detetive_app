"use client";

import { BarChart3, FolderOpen, PlayCircle, Plus, Settings } from "lucide-react";
import { useGame } from "@/components/game/game-provider";
import { ButtonLink } from "@/components/ui/button";
import { Card, LoadingScreen, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { SessionStatusBadge } from "@/components/game/labels";
import { LogoMark } from "@/components/layout/logo";
import { getCaseAvailability, getCaseById, listCases } from "@/lib/game/case-loader";
import { isFinished } from "@/lib/game/selectors";
import { computeCampaignStats } from "@/lib/persistence/save-manager";
import { formatDate, formatDuration } from "@/lib/utils/format";

export default function HomePage() {
  const { ready, save } = useGame();
  if (!ready) return <LoadingScreen />;

  const cases = listCases();
  const stats = computeCampaignStats(save);
  const lastCase = save.lastCaseId ? getCaseById(save.lastCaseId) : undefined;
  const lastSession = lastCase ? save.sessions[lastCase.id] : undefined;
  const canContinue = !!lastCase && !!lastSession && !isFinished(lastSession);
  const nextCase =
    cases.find((c) => getCaseAvailability(save, c) === "em_andamento") ??
    cases.find((c) => getCaseAvailability(save, c) === "disponivel");

  return (
    <div className="space-y-8">
      <section className="grid-paper relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-8 sm:px-8 sm:py-10">
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Agência Meridiano</p>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Bem-vindo(a) à central, agente.</h1>
          <p className="mt-3 text-ink-soft">
            Peças desaparecidas, documentos falsos e testemunhas que não dizem a verdade. Reúna evidências, descarte
            hipóteses e siga o rastro até o responsável antes que o tempo acabe.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {canContinue && lastCase && (
              <ButtonLink href={`/investigacao/${lastCase.slug}`} size="lg" icon={<PlayCircle className="size-5" aria-hidden />}>
                Continuar investigação
              </ButtonLink>
            )}
            <ButtonLink
              href={nextCase ? `/casos/${nextCase.slug}` : "/casos"}
              size="lg"
              variant={canContinue ? "secondary" : "primary"}
              icon={<Plus className="size-5" aria-hidden />}
            >
              Novo caso
            </ButtonLink>
            <ButtonLink href="/casos" size="lg" variant="secondary" icon={<FolderOpen className="size-5" aria-hidden />}>
              Arquivo de casos
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <SectionTitle>Progresso da campanha</SectionTitle>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-3xl font-bold text-ink">
              {stats.casesCompleted}
              <span className="text-lg font-medium text-muted"> / {cases.length} casos concluídos</span>
            </p>
            <p className="text-sm text-muted">{stats.casesSolved} com responsável identificado</p>
          </div>
          <div className="mt-3">
            <ProgressBar value={stats.casesCompleted} max={cases.length} label="Casos concluídos na campanha" />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Pontos (melhores)</dt>
              <dd className="text-lg font-semibold text-ink">{stats.totalBestScore}</dd>
            </div>
            <div>
              <dt className="text-muted">Tentativas</dt>
              <dd className="text-lg font-semibold text-ink">{stats.totalAttempts}</dd>
            </div>
            <div>
              <dt className="text-muted">Taxa de sucesso</dt>
              <dd className="text-lg font-semibold text-ink">
                {stats.finishedRuns ? `${Math.round(stats.successRate * 100)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Tempo médio</dt>
              <dd className="text-lg font-semibold text-ink">
                {stats.finishedRuns ? formatDuration(stats.averageTime) : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <SectionTitle>Último caso</SectionTitle>
          {lastCase ? (
            <div className="mt-3 space-y-2">
              <p className="font-semibold text-ink">{lastCase.title}</p>
              {lastSession && <SessionStatusBadge status={lastSession.status} />}
              <p className="text-sm text-muted">
                Atualizado em {formatDate(lastSession?.updatedAt ?? save.records[lastCase.id]?.lastPlayedAt)}
              </p>
              <ButtonLink
                href={canContinue ? `/investigacao/${lastCase.slug}` : `/casos/${lastCase.slug}`}
                variant="secondary"
                size="sm"
              >
                {canContinue ? "Voltar à central" : "Ver dossiê"}
              </ButtonLink>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Nenhum caso jogado ainda. Comece pelo primeiro dossiê: ele inclui um tutorial.</p>
          )}
        </Card>
      </div>

      <nav aria-label="Atalhos" className="grid gap-3 sm:grid-cols-2">
        <ButtonLink href="/desempenho" variant="secondary" size="lg" icon={<BarChart3 className="size-5" aria-hidden />}>
          Meu desempenho
        </ButtonLink>
        <ButtonLink href="/configuracoes" variant="secondary" size="lg" icon={<Settings className="size-5" aria-hidden />}>
          Configurações
        </ButtonLink>
      </nav>
    </div>
  );
}
