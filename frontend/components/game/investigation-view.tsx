"use client";

import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  FolderSearch,
  Gavel,
  History,
  Lightbulb,
  Map as MapIcon,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { InvestigativeAction } from "@/types/case";
import type { WarrantRequest } from "@/types/game";
import { useGame } from "./game-provider";
import { SessionStatusBadge } from "./labels";
import { TimeIndicator } from "./time-indicator";
import { DestinationPanel, LocationPanel } from "./location-panel";
import { WarrantPanel } from "./warrant-panel";
import { Timeline } from "./timeline";
import { TutorialOverlay } from "./tutorial-overlay";
import { InvestigationMap } from "@/components/map/investigation-map";
import { EvidenceArchive } from "@/components/evidence/evidence-archive";
import { SuspectBoard } from "@/components/suspects/suspect-board";
import { ActionResultDialog, type ActionResultView } from "@/components/dialogs/action-result-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { HintDialog } from "@/components/dialogs/hint-dialog";
import { Card, CardHeader, EmptyState, ErrorPanel, LoadingScreen } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  attemptCapture,
  performAction,
  requestWarrant,
  revealHint,
  setProfileAnswer,
  toggleEvidenceFlag,
  toggleEvidenceLink,
  toggleSuspectEliminated,
  travelTo,
  type EngineResult,
} from "@/lib/game/engine";
import { getCaseAvailability, getCaseById } from "@/lib/game/case-loader";
import { getLocation, getTravelCost, isFinished } from "@/lib/game/selectors";
import { cn, formatDuration } from "@/lib/utils/format";
import { sound } from "@/lib/audio/sound";

type Tab = "local" | "evidencias" | "suspeitos" | "mandado" | "linha";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "local", label: "Local", icon: MapIcon },
  { id: "evidencias", label: "Evidências", icon: FolderSearch },
  { id: "suspeitos", label: "Suspeitos", icon: Users },
  { id: "mandado", label: "Mandado", icon: Gavel },
  { id: "linha", label: "Linha do tempo", icon: History },
];

export function InvestigationView({ caseId }: { caseId: string }) {
  const caseDef = getCaseById(caseId)!;
  const game = useGame();
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("local");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResultView | null>(null);
  const [pendingTravel, setPendingTravel] = useState<string | null>(null);
  const [confirmCapture, setConfirmCapture] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);

  if (!game.ready) return <LoadingScreen message="Abrindo a central de investigação…" />;

  const session = game.save.sessions[caseDef.id];
  const availability = getCaseAvailability(game.save, caseDef);

  if (!session) {
    return (
      <Card className="mx-auto max-w-lg">
        <EmptyState
          title="Nenhuma investigação aberta para este caso"
          description={
            availability === "bloqueado"
              ? "Este caso ainda está bloqueado. Conclua os casos anteriores primeiro."
              : "Leia o relatório inicial e inicie a investigação a partir do dossiê."
          }
          action={<ButtonLink href={availability === "bloqueado" ? "/casos" : `/casos/${caseDef.slug}`}>Ir ao dossiê</ButtonLink>}
        />
      </Card>
    );
  }

  /** Troca de painel; no celular, volta ao topo para o conteúdo novo ficar visível. */
  const selectTab = (id: Tab) => {
    setTab(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) window.scrollTo({ top: 0 });
  };

  const finished = isFinished(session);
  const reportHref = `/relatorio/${caseDef.slug}`;
  const location = getLocation(caseDef, session.currentLocationId)!;
  const rightTab: Tab = tab === "local" ? "evidencias" : tab;
  const showTutorial =
    !!caseDef.tutorial && game.save.settings.tutorialEnabled && !game.save.tutorialCompleted && !tutorialDismissed && !finished;

  /** Executa uma função do motor e apresenta o resultado. */
  const exec = (fn: Parameters<typeof game.run>[1], view?: { title: string; witnessName?: string }) => {
    const r: EngineResult = game.run(caseDef.id, fn);
    if (!r.ok) {
      sound.play("error");
      notify(r.error, "erro");
      return r;
    }
    const nowFinished = isFinished(r.session);
    if (r.session.status === "concluido") sound.play("siren");
    else if (nowFinished) sound.play("fail");
    else if (r.session.warrant.status === "autorizado" && view?.title === "Pedido de mandado") sound.play("stamp");
    else if (r.tone === "erro") sound.play("error");
    else if (r.newEvidenceIds.length > 0) sound.play("clue");
    else if (r.tone === "alerta") sound.play("nothing");
    if (view || nowFinished || r.newEvidenceIds.length > 0) {
      setResult({
        title: view?.title ?? (nowFinished ? "Investigação encerrada" : "Resultado"),
        message: r.message,
        tone: r.tone,
        narrative: r.narrative,
        dialogue: r.dialogue,
        witnessName: view?.witnessName,
        newEvidenceIds: r.newEvidenceIds,
        finished: nowFinished,
      });
    } else if (r.message) {
      notify(r.message, r.tone);
    }
    return r;
  };

  const onAction = (action: InvestigativeAction) => {
    const witness = caseDef.witnesses.find((w) => w.id === action.witnessId);
    exec((c, s) => performAction(c, s, action.id), {
      title: action.label,
      witnessName: witness ? `${witness.name} · ${witness.role}` : undefined,
    });
  };

  const doTravel = (locationId: string) => {
    const r = exec((c, s) => travelTo(c, s, locationId));
    if (r.ok) {
      sound.play("land");
      setSelectedId(null);
      selectTab("local");
    }
  };

  const onTravel = (locationId: string) => {
    if (game.save.settings.confirmTravel) setPendingTravel(locationId);
    else doTravel(locationId);
  };

  const onWarrant = (request: WarrantRequest) =>
    exec((c, s) => requestWarrant(c, s, request), { title: "Pedido de mandado" });

  const onCapture = () => exec((c, s) => attemptCapture(c, s), { title: "Operação de captura" });

  const onRevealHint = () => {
    const r = game.run(caseDef.id, (c, s) => revealHint(c, s, { hintsEnabled: game.save.settings.hintsEnabled }));
    if (!r.ok) notify(r.error, "erro");
    else notify(r.message, "alerta");
  };

  const quiet = (fn: Parameters<typeof game.run>[1]) => {
    const r = game.run(caseDef.id, fn);
    if (!r.ok) notify(r.error, "erro");
    else if (r.message) notify(r.message, r.tone);
  };

  const travelCost = pendingTravel ? getTravelCost(caseDef, session.currentLocationId, pendingTravel) : null;

  const rightPanels: Record<Exclude<Tab, "local">, React.ReactNode> = {
    evidencias: (
      <EvidenceArchive
        caseDef={caseDef}
        session={session}
        onToggleFlag={(id) => quiet((_c, s) => toggleEvidenceFlag(s, id))}
        onToggleLink={(a, b) => quiet((_c, s) => toggleEvidenceLink(s, a, b))}
      />
    ),
    suspeitos: (
      <SuspectBoard
        caseDef={caseDef}
        session={session}
        onToggleEliminated={(id) => quiet((c, s) => toggleSuspectEliminated(c, s, id))}
      />
    ),
    mandado: (
      <WarrantPanel
        caseDef={caseDef}
        session={session}
        onProfileChange={(trait, value) => quiet((c, s) => setProfileAnswer(c, s, trait, value))}
        onSubmit={onWarrant}
      />
    ),
    linha: <Timeline caseDef={caseDef} session={session} />,
  };

  return (
    <div className="space-y-4 pb-16 lg:pb-0">
      {/* Cabeçalho do caso */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink href={`/casos/${caseDef.slug}`} variant="ghost" size="sm" icon={<ArrowLeft className="size-4" aria-hidden />}>
                Dossiê
              </ButtonLink>
              <SessionStatusBadge status={session.status} />
            </div>
            <h1 className="truncate text-xl font-bold text-ink sm:text-2xl">{caseDef.title}</h1>
            <p className="flex items-start gap-1.5 text-sm text-ink-soft">
              <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              {caseDef.objective}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TimeIndicator caseDef={caseDef} session={session} />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Lightbulb className="size-4" aria-hidden />} onClick={() => setHintsOpen(true)}>
                Dicas{session.hintsUsed > 0 ? ` (${session.hintsUsed})` : ""}
              </Button>
              <ButtonLink href={reportHref} variant={finished ? "primary" : "secondary"} size="sm" icon={<FileText className="size-4" aria-hidden />}>
                Relatório
              </ButtonLink>
            </div>
          </div>
        </div>
      </Card>

      {finished && (
        <ErrorPanel
          title="Investigação encerrada"
          description="Você está revendo o caso em modo de consulta. Nenhuma nova ação pode ser realizada."
          action={<ButtonLink href={reportHref} size="sm">Ver relatório final</ButtonLink>}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Coluna esquerda: mapa e local */}
        <div className={cn("space-y-4 lg:col-span-7", tab === "local" ? "block" : "hidden lg:block")}>
          <Card>
            <CardHeader
              title="Mapa da investigação"
              icon={<MapIcon className="size-4 text-accent" aria-hidden />}
              subtitle={`Você está em ${location.name}`}
            />
            <div className="space-y-4 p-4">
              <InvestigationMap caseDef={caseDef} session={session} selectedId={selectedId} onSelect={setSelectedId} />
              <DestinationPanel
                caseDef={caseDef}
                session={session}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onTravel={onTravel}
              />
            </div>
          </Card>
          <LocationPanel caseDef={caseDef} session={session} onAction={onAction} onCapture={() => setConfirmCapture(true)} />
        </div>

        {/* Coluna direita: painéis em abas */}
        <div className={cn("lg:col-span-5", tab === "local" ? "hidden lg:block" : "block")}>
          <Card className="lg:sticky lg:top-20">
            <div role="tablist" aria-label="Painéis da investigação" className="hidden border-b border-line lg:flex">
              {TABS.filter((t) => t.id !== "local").map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={rightTab === id}
                  onClick={() => selectTab(id)}
                  className={cn(
                    "flex min-h-12 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 text-sm font-medium",
                    rightTab === id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="hidden xl:inline">{label}</span>
                  <span className="xl:hidden">{label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="scrollbar-thin p-4 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto">
              <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink uppercase lg:sr-only">
                {TABS.find((t) => t.id === rightTab)?.label}
              </h2>
              {rightPanels[rightTab as Exclude<Tab, "local">]}
            </div>
          </Card>
        </div>
      </div>

      {/* Navegação inferior no celular */}
      <nav
        aria-label="Painéis da investigação (celular)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                aria-current={tab === id ? "page" : undefined}
                onClick={() => selectTab(id)}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  tab === id ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label.split(" ")[0]}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ActionResultDialog caseDef={caseDef} result={result} reportHref={reportHref} onClose={() => setResult(null)} />

      <ConfirmDialog
        open={!!pendingTravel}
        title="Confirmar deslocamento"
        confirmLabel="Viajar"
        onCancel={() => setPendingTravel(null)}
        onConfirm={() => {
          const target = pendingTravel;
          setPendingTravel(null);
          if (target) doTravel(target);
        }}
      >
        <p>
          Destino: <strong className="text-ink">{pendingTravel ? getLocation(caseDef, pendingTravel)?.name : ""}</strong>
        </p>
        <p>
          Tempo de viagem: <strong className="text-ink">{travelCost !== null ? formatDuration(travelCost) : "—"}</strong>. Restam{" "}
          {formatDuration(session.remainingTime)}.
        </p>
        {travelCost !== null && travelCost >= session.remainingTime && (
          <p className="text-danger">Esta viagem consome todo o tempo restante e encerra a investigação.</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmCapture}
        title="Executar captura aqui?"
        confirmLabel="Executar captura"
        onCancel={() => setConfirmCapture(false)}
        onConfirm={() => {
          setConfirmCapture(false);
          onCapture();
        }}
      >
        <p>
          Local: <strong className="text-ink">{location.name}</strong>
        </p>
        <p>
          Se o suspeito não estiver aqui, a operação custa{" "}
          {formatDuration(caseDef.completionRules.captureTimeCost + caseDef.completionRules.wrongCaptureTimePenalty)} e
          pode alertá-lo. Tentativas restantes: {caseDef.completionRules.maxCaptureAttempts - session.captureAttempts}.
        </p>
      </ConfirmDialog>

      <HintDialog
        open={hintsOpen}
        caseDef={caseDef}
        session={session}
        hintsEnabled={game.save.settings.hintsEnabled}
        onReveal={onRevealHint}
        onClose={() => setHintsOpen(false)}
      />

      {caseDef.tutorial && (
        <TutorialOverlay
          steps={caseDef.tutorial}
          open={showTutorial}
          onFinish={() => {
            setTutorialDismissed(true);
            game.setTutorialCompleted(true);
          }}
        />
      )}
    </div>
  );
}
