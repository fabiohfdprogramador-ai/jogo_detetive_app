"use client";

import {
  CheckCircle2,
  Crosshair,
  FileSearch,
  GitMerge,
  MessageSquare,
  Microscope,
  Navigation,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ActionKind, CaseDefinition, InvestigativeAction } from "@/types/case";
import type { GameSession } from "@/types/game";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  getAvailableActions,
  getCompletedActions,
  getConnections,
  getLocation,
  hasPendingActions,
  isFinished,
} from "@/lib/game/selectors";
import { t } from "@/lib/i18n";
import { cn, formatDuration } from "@/lib/utils/format";

export const ACTION_ICONS: Record<ActionKind, LucideIcon> = {
  examinar: FileSearch,
  entrevistar: MessageSquare,
  consultar_registro: ScrollText,
  analisar: Microscope,
  verificar_alibi: ShieldCheck,
  cruzar_informacoes: GitMerge,
};

export function LocationPanel({
  caseDef,
  session,
  onAction,
  onCapture,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  onAction: (action: InvestigativeAction) => void;
  onCapture: () => void;
}) {
  const location = getLocation(caseDef, session.currentLocationId)!;
  const available = getAvailableActions(caseDef, session, location.id);
  const done = getCompletedActions(caseDef, session, location.id);
  const finished = isFinished(session);

  return (
    <Card>
      <CardHeader
        title="Local atual"
        icon={<Navigation className="size-4 text-accent" aria-hidden />}
        actions={<Badge>{t(`location.${location.type}`)}</Badge>}
      />
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{location.name}</h3>
          <p className="text-sm text-muted">
            {location.city}, {location.country}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{location.description}</p>
        </div>

        {session.status === "mandado_autorizado" && (
          <div className="rounded-lg border border-accent/50 bg-accent/10 p-3">
            <p className="text-sm text-ink">
              Mandado autorizado. Se o suspeito estiver aqui, a equipe pode agir agora.
            </p>
            <Button className="mt-2 w-full sm:w-auto" icon={<Crosshair className="size-4" aria-hidden />} onClick={onCapture}>
              Executar captura aqui ({formatDuration(caseDef.completionRules.captureTimeCost)})
            </Button>
          </div>
        )}

        <div>
          <h4 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Ações disponíveis</h4>
          {available.length === 0 ? (
            <EmptyState
              title={finished ? "Investigação encerrada" : "Nada mais a fazer aqui por enquanto"}
              description={
                finished
                  ? undefined
                  : "Novas ações podem surgir quando você encontrar outras pistas. Use o mapa para seguir viagem."
              }
            />
          ) : (
            <ul className="space-y-2">
              {available.map((action) => {
                const Icon = ACTION_ICONS[action.kind];
                const tooExpensive = action.timeCost > session.remainingTime;
                return (
                  <li key={action.id}>
                    <button
                      type="button"
                      disabled={finished}
                      onClick={() => onAction(action)}
                      className="group flex min-h-14 w-full items-start gap-3 rounded-lg border border-line bg-surface-2 p-3 text-left transition-colors hover:border-accent/60 hover:bg-surface-3 disabled:opacity-50"
                    >
                      <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">{action.label}</span>
                        <span className="block text-sm text-muted">{action.description}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={tooExpensive ? "danger" : "neutral"}>
                          <span className="sr-only">Custo: </span>
                          {formatDuration(action.timeCost)}
                        </Badge>
                        <span className="text-[11px] text-muted">{t(`action.${action.kind}`)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {done.length > 0 && (
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm text-ink-soft">
              Ações já realizadas aqui ({done.length})
            </summary>
            <ul className="space-y-1 px-3 pb-3 text-sm">
              {done.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-muted">
                  <CheckCircle2 className="size-4 text-ok" aria-hidden />
                  {a.label}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}

/** Detalhe do destino selecionado no mapa, com custo e botão de viagem. */
export function DestinationPanel({
  caseDef,
  session,
  selectedId,
  onTravel,
  onSelect,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  selectedId: string | null;
  onTravel: (locationId: string) => void;
  onSelect: (locationId: string) => void;
}) {
  const connections = getConnections(caseDef, session, session.currentLocationId);
  const selected = selectedId ? getLocation(caseDef, selectedId) : undefined;
  const route = connections.find((c) => c.location.id === selectedId);
  const finished = isFinished(session);

  return (
    <div className="space-y-3">
      {selected && selected.id !== session.currentLocationId && (
        <div className="rounded-lg border border-info/50 bg-info/5 p-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink">{selected.name}</h3>
            <Badge>{t(`location.${selected.type}`)}</Badge>
            <Badge tone={session.visitedLocationIds.includes(selected.id) ? "ok" : "neutral"}>
              {session.visitedLocationIds.includes(selected.id) ? "Visitado" : "Não visitado"}
            </Badge>
            {hasPendingActions(caseDef, session, selected.id) && session.visitedLocationIds.includes(selected.id) && (
              <Badge tone="info">Ações pendentes</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {selected.city}, {selected.country}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{selected.description}</p>
          {route ? (
            <Button
              className="mt-3 w-full sm:w-auto"
              disabled={finished}
              icon={<Navigation className="size-4" aria-hidden />}
              onClick={() => onTravel(selected.id)}
            >
              Viajar ({formatDuration(route.minutes)})
            </Button>
          ) : (
            <p className="mt-3 text-sm text-warn">
              Não há rota direta a partir do local atual. Passe por um local intermediário.
            </p>
          )}
        </div>
      )}
      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">Destinos a partir daqui</h4>
        <ul className="grid gap-2 sm:grid-cols-2">
          {connections.map(({ location, minutes }) => (
            <li key={location.id}>
              <button
                type="button"
                onClick={() => onSelect(location.id)}
                aria-pressed={selectedId === location.id}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selectedId === location.id
                    ? "border-info/70 bg-info/10 text-ink"
                    : "border-line bg-surface-2 text-ink-soft hover:bg-surface-3",
                )}
              >
                <span className="truncate">{location.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted">{formatDuration(minutes)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
