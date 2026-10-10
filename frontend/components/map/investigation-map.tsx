"use client";

import type { KeyboardEvent } from "react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession } from "@/types/game";
import { getConnections, getVisibleLocations, hasPendingActions } from "@/lib/game/selectors";
import { formatDuration } from "@/lib/utils/format";

/**
 * Mapa estilizado original. Mostra apenas locais já identificados, as rotas entre eles
 * e o custo de deslocamento a partir do local atual. Clicar (ou Enter/Espaço) seleciona
 * um destino; a viagem é confirmada no painel ao lado.
 */
export function InvestigationMap({
  caseDef,
  session,
  selectedId,
  onSelect,
}: {
  caseDef: CaseDefinition;
  session: GameSession;
  selectedId: string | null;
  onSelect: (locationId: string) => void;
}) {
  const visible = getVisibleLocations(caseDef, session);
  const visibleIds = new Set(visible.map((l) => l.id));
  const reachable = new Map(
    getConnections(caseDef, session, session.currentLocationId).map((c) => [c.location.id, c.minutes]),
  );
  const routes = caseDef.routes.filter(([a, b]) => visibleIds.has(a) && visibleIds.has(b));
  const pos = (id: string) => caseDef.locations.find((l) => l.id === id)!.position;

  const onKey = (event: KeyboardEvent, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  return (
    <figure className="relative overflow-hidden rounded-lg border border-line bg-[#0c1526]">
      <svg viewBox="-6 -6 112 112" className="block aspect-[4/3] w-full" preserveAspectRatio="xMidYMid meet">
        <title>{`Mapa da investigação: ${caseDef.mapLabel}`}</title>
        <defs>
          <pattern id="map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#1f2d48" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect x="-6" y="-6" width="112" height="112" fill="url(#map-grid)" />
        {/* contornos decorativos abstratos */}
        <path d="M-6 70 C 20 60, 30 85, 55 78 S 90 60, 106 72" fill="none" stroke="#1d2b45" strokeWidth="0.8" />
        <path d="M-6 30 C 15 40, 35 18, 60 26 S 95 40, 106 22" fill="none" stroke="#1d2b45" strokeWidth="0.8" />

        {routes.map(([a, b, minutes]) => {
          const pa = pos(a);
          const pb = pos(b);
          const fromCurrent = a === session.currentLocationId || b === session.currentLocationId;
          return (
            <g key={`${a}-${b}`}>
              <line
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={fromCurrent ? "#f2b544" : "#34486d"}
                strokeOpacity={fromCurrent ? 0.8 : 0.9}
                strokeWidth={fromCurrent ? 0.7 : 0.45}
                strokeDasharray={fromCurrent ? undefined : "1.4 1.2"}
              />
              {fromCurrent && (
                <text
                  x={(pa.x + pb.x) / 2}
                  y={(pa.y + pb.y) / 2 - 1.2}
                  textAnchor="middle"
                  fontSize="2.6"
                  fill="#f2b544"
                  fontFamily="ui-monospace, monospace"
                  stroke="#0c1526"
                  strokeWidth="0.8"
                  paintOrder="stroke"
                >
                  {formatDuration(minutes)}
                </text>
              )}
            </g>
          );
        })}

        {visible.map((location) => {
          const isCurrent = location.id === session.currentLocationId;
          const isSelected = location.id === selectedId;
          const visited = session.visitedLocationIds.includes(location.id);
          const pending = hasPendingActions(caseDef, session, location.id);
          const travel = reachable.get(location.id);
          const status = isCurrent
            ? "local atual"
            : travel !== undefined
              ? `viagem de ${formatDuration(travel)}`
              : "sem rota direta";
          const labelBelow = location.position.y < 12;
          return (
            <g
              key={location.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${location.name}, ${location.city}. ${status}. ${visited ? "Visitado" : "Não visitado"}${pending ? ", com ações pendentes" : ""}.`}
              onClick={() => onSelect(location.id)}
              onKeyDown={(e) => onKey(e, location.id)}
              className="cursor-pointer outline-none [&:focus-visible_.focus-ring]:opacity-100"
            >
              <circle cx={location.position.x} cy={location.position.y} r="6" fill="transparent" />
              <circle
                className="focus-ring opacity-0"
                cx={location.position.x}
                cy={location.position.y}
                r="4.6"
                fill="none"
                stroke="#ffc85c"
                strokeWidth="0.6"
              />
              {isCurrent && (
                <circle
                  cx={location.position.x}
                  cy={location.position.y}
                  r="2.6"
                  fill="none"
                  stroke="#f2b544"
                  strokeWidth="0.5"
                  className="animate-pulse-ring"
                />
              )}
              {isSelected && !isCurrent && (
                <circle cx={location.position.x} cy={location.position.y} r="3.8" fill="none" stroke="#6cb4ff" strokeWidth="0.6" />
              )}
              <circle
                cx={location.position.x}
                cy={location.position.y}
                r={isCurrent ? 2.6 : 2.1}
                fill={isCurrent ? "#f2b544" : visited ? "#b7c2d6" : "#0c1526"}
                stroke={isCurrent ? "#ffc85c" : "#b7c2d6"}
                strokeWidth="0.6"
              />
              {pending && (
                <circle cx={location.position.x + 2.2} cy={location.position.y - 2.2} r="1.1" fill="#6cb4ff" stroke="#0c1526" strokeWidth="0.4" />
              )}
              <text
                x={location.position.x}
                y={location.position.y + (labelBelow ? 6 : -4)}
                textAnchor="middle"
                fontSize="2.9"
                fontWeight={isCurrent ? 700 : 500}
                fill={isCurrent ? "#ffc85c" : "#e8edf6"}
                stroke="#0c1526"
                strokeWidth="0.9"
                paintOrder="stroke"
                fontFamily="ui-sans-serif, system-ui"
              >
                {location.city === location.name ? location.name : shortName(location.name)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-xs text-muted">
        <span className="font-medium text-ink-soft">{caseDef.mapLabel}</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-accent" aria-hidden /> Local atual
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-ink-soft" aria-hidden /> Visitado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full border border-ink-soft" aria-hidden /> Não visitado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rounded-full bg-info" aria-hidden /> Ações pendentes
        </span>
      </figcaption>
    </figure>
  );
}

function shortName(name: string) {
  const main = name.split(" — ")[0] ?? name;
  return main.length > 26 ? `${main.slice(0, 24)}…` : main;
}
