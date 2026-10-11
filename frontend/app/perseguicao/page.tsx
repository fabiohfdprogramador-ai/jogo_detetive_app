"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, PlayCircle, XCircle } from "lucide-react";
import { useGame } from "@/components/game/game-provider";
import { Card, CardHeader, LoadingScreen, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Flag } from "@/components/chase/flag";
import { ORGANIZATION, RANKS, SUSPECTS, rankIndexFor } from "@/data/world/suspects";
import { getCity } from "@/data/world/cities";
import { formatChaseClock } from "@/lib/chase/engine";
import { sound } from "@/lib/audio/sound";
import { formatDate } from "@/lib/utils/format";

const STATUS_LABEL = {
  capturado: "🚔 Capturado",
  fugiu: "💨 Fugiu",
  prisao_errada: "⛓️ Prisão errada",
  tempo_esgotado: "⌛ Tempo esgotado",
  ativo: "🕵️ Em andamento",
} as const;

export default function ChaseLobbyPage() {
  const router = useRouter();
  const { ready, save, startChase, abandonChase } = useGame();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  if (!ready) return <LoadingScreen />;

  const { record, active } = save.chase;
  const rankIndex = rankIndexFor(record.solved);
  const rank = RANKS[rankIndex]!;
  const next = RANKS[rankIndex + 1];
  const inProgress = active && active.status === "ativo";
  const city = inProgress ? getCity(active.currentCityId) : undefined;

  const begin = () => {
    sound.unlock();
    sound.play("click");
    startChase();
    router.push("/perseguicao/jogo");
  };

  return (
    <div className="space-y-6">
      <section className="grid-paper relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-8 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">🌍 Modo Perseguição</p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Siga o rastro pelo mundo</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          A {ORGANIZATION.name} {ORGANIZATION.emoji} está roubando tesouros pelo planeta. Ouça as testemunhas, decifre as
          pistas sobre o próximo destino, descubra quem é o(a) culpado(a) na Central de Dados e faça a prisão antes do prazo.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {inProgress ? (
            <>
              <Button size="lg" icon={<PlayCircle className="size-5" aria-hidden />} onClick={() => router.push("/perseguicao/jogo")}>
                Continuar missão
              </Button>
              <Button size="lg" variant="secondary" icon={<XCircle className="size-5" aria-hidden />} onClick={() => setConfirmAbandon(true)}>
                Abandonar missão
              </Button>
            </>
          ) : (
            <Button size="lg" icon={<Globe2 className="size-5" aria-hidden />} onClick={begin}>
              Nova missão
            </Button>
          )}
        </div>
        {inProgress && city && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Flag code={city.countryCode} country={city.country} /> Você está em {city.name} · {formatChaseClock(active.hour)} ·{" "}
            {active.case.item.emoji} {active.case.item.name}
          </p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>Patente</SectionTitle>
          <p className="mt-2 text-2xl font-bold text-ink">
            <span aria-hidden>{rank.emoji}</span> {rank.name}
          </p>
          {next ? (
            <div className="mt-3 space-y-1.5">
              <ProgressBar value={record.solved - rank.min} max={next.min - rank.min} label="Progresso até a próxima patente" />
              <p className="text-sm text-muted">
                {next.min - record.solved} captura(s) para {next.emoji} {next.name}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-accent">Patente máxima alcançada!</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Missões desta patente: {rank.stops} cidades na rota, prazo {formatChaseClock(rank.deadline, true)}.
          </p>
        </Card>
        <Card className="p-5">
          <SectionTitle>Placar</SectionTitle>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Capturas</dt>
              <dd className="text-2xl font-bold text-ok">{record.solved}</dd>
            </div>
            <div>
              <dt className="text-muted">Fugas</dt>
              <dd className="text-2xl font-bold text-danger">{record.failed}</dd>
            </div>
            <div>
              <dt className="text-muted">Melhor missão</dt>
              <dd className="font-semibold text-ink">{record.bestScore} pts</dd>
            </div>
            <div>
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold text-ink">{record.totalScore} pts</dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <SectionTitle>Como jogar</SectionTitle>
          <ol className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>🔎 Investigue 3 lugares em cada cidade.</li>
            <li>🧭 Use as pistas para escolher o próximo voo.</li>
            <li>🤷 Ninguém viu nada? Cidade errada: volte!</li>
            <li>🖥️ Anote as características e emita o mandado.</li>
            <li>🚔 Na última cidade, encontre o esconderijo.</li>
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title={`${ORGANIZATION.emoji} Fichário da ${ORGANIZATION.name}`} subtitle="Os 12 membros conhecidos da organização" />
        <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {SUSPECTS.map((s) => (
            <li key={s.id} className="rounded-lg border border-line bg-surface-2 p-2 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl text-2xl" style={{ background: `hsl(${s.hue} 35% 22%)` }} aria-hidden>
                {s.emoji}
              </span>
              <p className="mt-1 text-sm font-medium text-ink">{s.name}</p>
            </li>
          ))}
        </ul>
      </Card>

      {record.history.length > 0 && (
        <Card>
          <CardHeader title="Últimas missões" />
          <ul className="divide-y divide-line">
            {record.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="text-ink">{h.itemName}</span>
                <span className="text-muted">
                  {STATUS_LABEL[h.status]} · {h.score} pts · {formatDate(h.finishedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonar a missão?"
        confirmLabel="Abandonar"
        destructive
        onCancel={() => setConfirmAbandon(false)}
        onConfirm={() => {
          setConfirmAbandon(false);
          abandonChase();
        }}
      >
        <p>A missão atual será descartada sem contar como captura nem como fuga.</p>
      </ConfirmDialog>
    </div>
  );
}
