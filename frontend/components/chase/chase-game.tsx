"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Monitor, Plane, Search } from "lucide-react";
import type { ChaseSession, ChaseSpot } from "@/types/chase";
import { useGame } from "@/components/game/game-provider";
import { useToast } from "@/components/ui/toast";
import { Card, EmptyState, LoadingScreen, ProgressBar } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { WorldMap, type Flight, type MapPoint } from "./world-map";
import { DataCenter } from "./data-center";
import { Notebook } from "./notebook";
import { BriefingDialog, EndingDialog, FlightDialog, WitnessDialog } from "./chase-dialogs";
import { Flag } from "./flag";
import { getCity } from "@/data/world/cities";
import { PLACES, RANKS, getChaseSuspect } from "@/data/world/suspects";
import {
  flightHours,
  formatChaseClock,
  investigate,
  issueWarrant,
  setTraitFilter,
  spotCost,
  travel,
  type ChaseResult,
} from "@/lib/chase/engine";
import { sound } from "@/lib/audio/sound";
import { cn } from "@/lib/utils/format";

type Mode = "investigar" | "viajar" | "dados" | "caderno";

const MODES: { id: Mode; label: string; emoji: string; icon: typeof Search }[] = [
  { id: "investigar", label: "Investigar", emoji: "🔎", icon: Search },
  { id: "viajar", label: "Viajar", emoji: "✈️", icon: Plane },
  { id: "dados", label: "Central de Dados", emoji: "🖥️", icon: Monitor },
  { id: "caderno", label: "Caderno", emoji: "📒", icon: BookOpen },
];

export function ChaseGame() {
  const router = useRouter();
  const game = useGame();
  const notify = useToast();
  const session = game.save.chase.active;
  const [mode, setMode] = useState<Mode>("investigar");
  const [witness, setWitness] = useState<ChaseSpot | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [flight, setFlight] = useState<(Flight & { fromName: string; toName: string; hours: number }) | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(
    () => !!session && session.path.length === 1 && session.notes.length === 0 && session.status === "ativo",
  );

  if (!game.ready) return <LoadingScreen message="Conectando à Central Meridiano…" />;

  if (!session) {
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          title="Nenhuma missão em andamento"
          description="Volte à central para receber uma nova missão."
          action={<ButtonLink href="/perseguicao">Ir para a central</ButtonLink>}
        />
      </Card>
    );
  }

  const city = getCity(session.currentCityId)!;
  const stop = session.case.stops[session.currentCityId]!;
  const visited = session.visitedSpots[session.currentCityId] ?? [];
  const finished = session.status !== "ativo";
  const warrant = session.warrantSuspectId ? getChaseSuspect(session.warrantSuspectId) : null;
  const timeLeft = Math.max(0, session.case.deadlineHour - session.hour);
  const totalTime = session.case.deadlineHour - session.case.startHour;

  const run = (fn: (s: ChaseSession) => ChaseResult) => {
    const r = game.runChase(fn);
    if (!r.ok) {
      sound.play("error");
      notify(r.error, "erro");
    }
    return r;
  };

  const choose = (m: Mode) => {
    sound.play("click");
    setMode(m);
  };

  const onInvestigate = (spot: ChaseSpot) => {
    sound.play("page");
    const r = run((s) => investigate(s, spot.id));
    if (!r.ok) return;
    if (r.session.status !== "ativo" && spot.hideout) return; // o final é mostrado pelo EndingDialog
    if (r.slept) notify("😴 Você passou a noite no hotel e recomeçou às 7h.", "info");
    setWitness(spot);
    setTimeout(() => {
      if (stop.kind === "despiste") sound.play("nothing");
      else if (stop.kind === "final") sound.play("alert");
      else sound.play("clue");
    }, 250);
  };

  const onTravel = (cityId: string) => {
    const from = city;
    const to = getCity(cityId)!;
    const hours = flightHours(from.id, to.id);
    const r = run((s) => travel(s, cityId));
    if (!r.ok) return;
    sound.play("travel");
    setDestination(null);
    setFlight({ key: `${from.id}-${to.id}-${r.session.hour}`, from: [from.lon, from.lat], to: [to.lon, to.lat], fromName: from.name, toName: to.name, hours });
  };

  const endFlight = () => {
    setFlight(null);
    sound.play("land");
    setMode("investigar");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const points: MapPoint[] = [
    ...[...new Set(session.path)]
      .filter((id) => id !== session.currentCityId && !stop.connections.includes(id))
      .map((id) => {
        const c = getCity(id)!;
        return { id, lat: c.lat, lon: c.lon, label: c.name, kind: "visited" as const, countryCode: c.countryCode };
      }),
    ...stop.connections.map((id) => {
      const c = getCity(id)!;
      return {
        id,
        lat: c.lat,
        lon: c.lon,
        label: c.name,
        kind: "option" as const,
        countryCode: c.countryCode,
        badge: mode === "viajar" ? `${flightHours(city.id, id)} h` : undefined,
      };
    }),
    { id: city.id, lat: city.lat, lon: city.lon, label: city.name, emoji: city.emoji, kind: "current", countryCode: city.countryCode },
  ];
  const pathCoords = session.path.map((id) => {
    const c = getCity(id)!;
    return [c.lon, c.lat] as [number, number];
  });

  const solvedBefore = game.save.chase.record.solved - (session.status === "capturado" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Barra superior: cidade, relógio e mandado */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ButtonLink href="/perseguicao" variant="ghost" size="sm" aria-label="Voltar à central" icon={<ArrowLeft className="size-4" aria-hidden />} />
            <span className="text-4xl" aria-hidden>
              {city.emoji}
            </span>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
                {city.name} <Flag code={city.countryCode} country={city.country} className="h-5 w-7" />
              </h1>
              <p className="text-sm text-muted">
                {city.country} · {RANKS[session.case.rankIndex]!.emoji} {RANKS[session.case.rankIndex]!.name}
              </p>
            </div>
          </div>
          <div className="min-w-[15rem] space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-mono text-ink">🕰️ {formatChaseClock(session.hour)}</span>
              <span className="text-muted">prazo: {formatChaseClock(session.case.deadlineHour, true)}</span>
            </div>
            <ProgressBar
              value={timeLeft}
              max={totalTime}
              tone={timeLeft / totalTime > 0.5 ? "ok" : timeLeft / totalTime > 0.2 ? "warn" : "danger"}
              label={`Tempo restante: ${timeLeft} horas`}
            />
            <p className={cn("text-xs", warrant ? "text-ok" : "text-muted")}>
              {warrant ? `📜 Mandado: ${warrant.name}` : "📜 Sem mandado de prisão"}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <WorldMap
            points={points}
            path={pathCoords}
            selectedId={destination}
            onSelect={(id) => {
              sound.play("click");
              setDestination(id);
              setMode("viajar");
            }}
          />
          <Card className="grid-paper p-4">
            <p className="text-ink-soft">
              <span className="mr-1 text-2xl align-middle" aria-hidden>
                {city.emoji}
              </span>
              {city.description}
            </p>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <nav aria-label="Ações do agente" className="grid grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => choose(m.id)}
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-xs font-semibold transition-all sm:text-sm",
                  mode === m.id
                    ? "border-accent bg-accent/15 text-accent shadow-[0_0_0_1px_var(--color-accent)]"
                    : "border-line bg-surface text-ink-soft hover:-translate-y-0.5 hover:bg-surface-2",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {m.emoji}
                </span>
                {m.label}
              </button>
            ))}
          </nav>

          <Card className="p-4">
            {mode === "investigar" && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">🔎 Onde investigar em {city.name}?</h2>
                <ul className="space-y-2">
                  {stop.spots.map((spot) => {
                    const place = PLACES[spot.place];
                    const done = visited.includes(spot.id);
                    return (
                      <li key={spot.id}>
                        <button
                          type="button"
                          disabled={finished}
                          onClick={() => onInvestigate(spot)}
                          className={cn(
                            "flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50",
                            done ? "border-line bg-surface-2/60" : "border-line-strong bg-surface-2 hover:border-accent/60",
                          )}
                        >
                          <span className="text-3xl" aria-hidden>
                            {place.emoji}
                          </span>
                          <span className="flex-1">
                            <span className="block font-semibold text-ink">{place.label}</span>
                            <span className="block text-sm text-muted">
                              {spot.witness.emoji} {spot.witness.role}
                            </span>
                          </span>
                          <span className={cn("rounded-md px-2 py-1 text-xs font-medium", done ? "bg-ok/10 text-ok" : "bg-surface-3 text-ink-soft")}>
                            {done ? "✓ visitado" : `⏱️ ${spotCost(session)} h`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted">Cada nova conversa na mesma cidade leva mais tempo. Reler um depoimento é grátis.</p>
              </div>
            )}

            {mode === "viajar" && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">✈️ Para onde voar?</h2>
                <p className="text-sm text-muted">Escolha um destino na lista ou no mapa. Só uma das cidades está no rastro certo.</p>
                <ul className="space-y-2">
                  {stop.connections.map((id) => {
                    const c = getCity(id)!;
                    const selected = destination === id;
                    const back = session.path.at(-2) === id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          disabled={finished}
                          aria-pressed={selected}
                          data-city-id={id}
                          onClick={() => {
                            sound.play("click");
                            setDestination(id);
                          }}
                          className={cn(
                            "flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                            selected ? "border-info bg-info/10" : "border-line bg-surface-2 hover:bg-surface-3",
                          )}
                        >
                          <Flag code={c.countryCode} country={c.country} className="h-6 w-9" />
                          <span className="flex-1">
                            <span className="block font-semibold text-ink">
                              {c.emoji} {c.name}
                            </span>
                            <span className="block text-xs text-muted">
                              {c.country}
                              {back ? " · de onde você veio" : ""}
                            </span>
                          </span>
                          <span className="font-mono text-sm text-ink-soft">{flightHours(city.id, id)} h</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!destination || finished}
                  icon={<Plane className="size-5" aria-hidden />}
                  onClick={() => destination && onTravel(destination)}
                >
                  {destination ? `Embarcar para ${getCity(destination)!.name}` : "Selecione um destino"}
                </Button>
              </div>
            )}

            {mode === "dados" && (
              <DataCenter
                session={session}
                onFilter={(trait, value) => {
                  sound.play("click");
                  run((s) => setTraitFilter(s, trait, value));
                }}
                onWarrant={() => {
                  const r = run((s) => issueWarrant(s));
                  if (r.ok) {
                    sound.play("stamp");
                    notify(r.message, "sucesso");
                  }
                }}
              />
            )}

            {mode === "caderno" && <Notebook session={session} />}
          </Card>
        </div>
      </div>

      <BriefingDialog session={session} open={briefingOpen} onClose={() => setBriefingOpen(false)} />
      <WitnessDialog spot={witness} cityName={city.name} onClose={() => setWitness(null)} />
      <FlightDialog
        flight={flight}
        fromName={flight?.fromName ?? ""}
        toName={flight?.toName ?? ""}
        hours={flight?.hours ?? 0}
        onDone={endFlight}
      />
      {!flight && !witness && (
        <EndingDialog
          session={session}
          solvedBefore={solvedBefore}
          onNewMission={() => {
            game.startChase();
            setMode("investigar");
            setBriefingOpen(true);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
