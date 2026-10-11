"use client";

import { useEffect, useState } from "react";
import type { ChaseSession, ChaseSpot } from "@/types/chase";
import { Modal } from "@/components/ui/modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Typewriter } from "./typewriter";
import { WorldMap, type Flight } from "./world-map";
import { Flag } from "./flag";
import { getCity } from "@/data/world/cities";
import { ORGANIZATION, PLACES, RANKS, getChaseSuspect, rankIndexFor, traitOption } from "@/data/world/suspects";
import { chaseScore, formatChaseClock } from "@/lib/chase/engine";
import { sound } from "@/lib/audio/sound";

export function BriefingDialog({ session, open, onClose }: { session: ChaseSession; open: boolean; onClose: () => void }) {
  const city = getCity(session.case.route[0]!)!;
  const culprit = getChaseSuspect(session.case.culpritId)!;
  const female = culprit.traits.sexo === "feminino";
  const rank = RANKS[session.case.rankIndex]!;
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) sound.play("alert");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span>📰 Plantão da Agência Meridiano</span>}
      footer={<Button onClick={onClose}>{done ? "Aceitar missão 🕵️" : "Pular e aceitar"}</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
          <span className="text-5xl" aria-hidden>
            {session.case.item.emoji}
          </span>
          <div>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Flag code={city.countryCode} country={city.country} /> {city.name}, {city.country}
            </p>
            <p className="text-sm text-muted">
              {rank.emoji} Missão para {rank.name} · prazo: {formatChaseClock(session.case.deadlineHour)}
            </p>
          </div>
        </div>
        <Typewriter
          className="cursor-pointer font-mono text-[15px] leading-relaxed text-ink"
          onDone={() => setDone(true)}
          lines={[
            `URGENTE! ${capitalize(session.case.item.name)} foi roubado(a) em ${city.name}.`,
            `Testemunhas viram ${female ? "uma mulher" : "um homem"} da ${ORGANIZATION.name} ${ORGANIZATION.emoji} fugindo do local.`,
            `Sua missão: seguir o rastro pelo mundo, descobrir quem é ${female ? "a suspeita" : "o suspeito"}, emitir o mandado de prisão e efetuar a captura até ${formatChaseClock(session.case.deadlineHour)}.`,
            "Boa sorte, agente.",
          ]}
        />
      </div>
    </Modal>
  );
}

export function WitnessDialog({
  spot,
  cityName,
  onClose,
}: {
  spot: ChaseSpot | null;
  cityName: string;
  onClose: () => void;
}) {
  if (!spot) return null;
  const place = PLACES[spot.place];
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span>
          {place.emoji} {place.label} · {cityName}
        </span>
      }
      footer={<Button onClick={onClose}>Continuar</Button>}
    >
      <div className="flex gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="grid size-16 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-4xl" aria-hidden>
            {spot.witness.emoji}
          </span>
          <span className="max-w-20 text-center text-[11px] leading-tight text-muted">{spot.witness.role}</span>
        </div>
        <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-line bg-surface-2 p-4">
          <Typewriter key={spot.id} lines={spot.lines.map((l) => `“${l}”`)} className="cursor-pointer text-ink" />
        </div>
      </div>
    </Modal>
  );
}

export function FlightDialog({
  flight,
  fromName,
  toName,
  hours,
  onDone,
}: {
  flight: Flight | null;
  fromName: string;
  toName: string;
  hours: number;
  onDone: () => void;
}) {
  if (!flight) return null;
  return (
    <Modal open onClose={onDone} title={<span>✈️ Em voo</span>} size="lg" footer={<Button variant="secondary" onClick={onDone}>Pular</Button>}>
      <p className="mb-3 text-center text-ink">
        <strong>{fromName}</strong> → <strong>{toName}</strong> <span className="text-muted">· {hours} h de viagem</span>
      </p>
      <WorldMap
        points={[
          { id: "from", lat: flight.from[1], lon: flight.from[0], label: fromName, kind: "visited" },
          { id: "to", lat: flight.to[1], lon: flight.to[0], label: toName, kind: "current" },
        ]}
        flight={flight}
        onFlightEnd={() => setTimeout(onDone, 400)}
        title={`Voo de ${fromName} para ${toName}`}
      />
    </Modal>
  );
}

const ENDINGS = {
  capturado: { emoji: "🚔", title: "Captura realizada!", tone: "text-ok" },
  fugiu: { emoji: "💨", title: "O suspeito escapou!", tone: "text-danger" },
  prisao_errada: { emoji: "⛓️", title: "Prisão da pessoa errada!", tone: "text-danger" },
  tempo_esgotado: { emoji: "⌛", title: "O tempo acabou!", tone: "text-danger" },
  ativo: { emoji: "", title: "", tone: "" },
} as const;

export function EndingDialog({
  session,
  solvedBefore,
  onNewMission,
}: {
  session: ChaseSession | null;
  solvedBefore: number;
  onNewMission: () => void;
}) {
  const finished = !!session && session.status !== "ativo";
  useEffect(() => {
    if (!finished || !session) return;
    if (session.status === "capturado") {
      sound.play("siren");
      setTimeout(() => sound.play("success"), 1900);
    } else {
      sound.play("fail");
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session || !finished) return null;
  const ending = ENDINGS[session.status];
  const culprit = getChaseSuspect(session.case.culpritId)!;
  const score = chaseScore(session);
  const won = session.status === "capturado";
  const promoted = won && rankIndexFor(solvedBefore + 1) > rankIndexFor(solvedBefore);
  const newRank = RANKS[rankIndexFor(solvedBefore + (won ? 1 : 0))]!;
  const lastCity = getCity(session.currentCityId)!;

  return (
    <Modal
      open
      dismissible={false}
      onClose={() => undefined}
      title={
        <span className={ending.tone}>
          {ending.emoji} {ending.title}
        </span>
      }
      footer={
        <>
          <ButtonLink href="/perseguicao" variant="secondary">
            Voltar à central
          </ButtonLink>
          <Button onClick={onNewMission}>Nova missão 🌍</Button>
        </>
      }
    >
      <div className="space-y-4 text-center">
        <div className="text-6xl" aria-hidden>
          {won ? "🎉" : "😞"}
        </div>
        <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl text-3xl" style={{ background: `hsl(${culprit.hue} 35% 22%)` }} aria-hidden>
            {culprit.emoji}
          </span>
          <div>
            <p className="font-semibold text-ink">{culprit.name}</p>
            <p className="text-xs text-muted">{culprit.bio}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {(["cabelo", "hobby", "marca", "veiculo"] as const).map((k) => traitOption(k, culprit.traits[k])?.emoji).join(" ")}
            </p>
          </div>
        </div>
        <p className="text-ink-soft">
          {won
            ? `${culprit.name} foi ${culprit.traits.sexo === "feminino" ? "presa" : "preso"} em ${lastCity.name}. ${capitalize(session.case.item.name)} ${session.case.item.emoji} foi recuperado(a)!`
            : session.status === "prisao_errada"
              ? `O mandado estava no nome errado. ${culprit.name} riu da sua cara e sumiu pelo mundo.`
              : session.status === "fugiu"
                ? `Você encontrou ${culprit.name}, mas sem mandado não pôde efetuar a prisão.`
                : `O prazo terminou e ${culprit.name} desapareceu com ${session.case.item.name}.`}
        </p>
        {won && (
          <p className="text-2xl font-bold text-accent">
            +{score} pontos <span className="text-base font-normal text-muted">· {formatChaseClock(session.hour)}</span>
          </p>
        )}
        {promoted && (
          <p className="rounded-xl border border-accent/60 bg-accent/10 p-3 font-semibold text-accent">
            {newRank.emoji} Promoção! Agora você é {newRank.name}.
          </p>
        )}
      </div>
    </Modal>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
