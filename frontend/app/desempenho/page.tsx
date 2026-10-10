"use client";

import Link from "next/link";
import { useGame } from "@/components/game/game-provider";
import { AvailabilityBadge } from "@/components/game/labels";
import { Card, CardHeader, LoadingScreen, SectionTitle } from "@/components/ui/primitives";
import { getCaseAvailability, listCases } from "@/lib/game/case-loader";
import { computeCampaignStats } from "@/lib/persistence/save-manager";
import { t } from "@/lib/i18n";
import { formatDate, formatDuration } from "@/lib/utils/format";

export default function PerformancePage() {
  const { ready, save } = useGame();
  if (!ready) return <LoadingScreen />;
  const stats = computeCampaignStats(save);
  const cases = listCases();

  const tiles = [
    { label: "Casos concluídos", value: `${stats.casesCompleted} / ${cases.length}` },
    { label: "Responsáveis identificados", value: String(stats.casesSolved) },
    { label: "Taxa de sucesso", value: stats.finishedRuns ? `${Math.round(stats.successRate * 100)}%` : "—" },
    { label: "Tempo médio por caso", value: stats.finishedRuns ? formatDuration(stats.averageTime) : "—" },
    { label: "Tentativas", value: String(stats.totalAttempts) },
    { label: "Dicas utilizadas", value: String(stats.hintsUsed) },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">Meu desempenho</h1>
        <p className="mt-1 text-ink-soft">Estatísticas guardadas neste dispositivo. Rankings on-line chegam numa próxima fase.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <SectionTitle>{tile.label}</SectionTitle>
            <p className="mt-2 text-2xl font-bold text-ink">{tile.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Por caso" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Resultados por caso</caption>
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="px-4 py-2 font-medium">Caso</th>
                <th scope="col" className="px-4 py-2 font-medium">Estado</th>
                <th scope="col" className="px-4 py-2 font-medium">Melhor</th>
                <th scope="col" className="px-4 py-2 font-medium">Classificação</th>
                <th scope="col" className="px-4 py-2 font-medium">Tentativas</th>
                <th scope="col" className="px-4 py-2 font-medium">Última vez</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const r = save.records[c.id];
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      <Link href={`/casos/${c.slug}`} className="text-ink underline-offset-2 hover:underline">
                        {c.title}
                      </Link>
                    </th>
                    <td className="px-4 py-2.5">
                      <AvailabilityBadge availability={getCaseAvailability(save, c)} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-ink">{r && r.finishedRuns > 0 ? r.bestScore : "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{r?.bestRating ? t(`rating.${r.bestRating}`) : "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{r?.attempts ?? 0}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{formatDate(r?.lastPlayedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
