"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoInterpolate, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { cn } from "@/lib/utils/format";

/**
 * Mapa-múndi real (dados Natural Earth, domínio público, via pacote world-atlas).
 * O enquadramento se ajusta aos pontos visíveis; voos são desenhados em grande círculo.
 */

export interface MapPoint {
  id: string;
  lat: number;
  lon: number;
  label: string;
  emoji?: string;
  kind: "current" | "option" | "visited";
  countryCode?: string;
  /** Texto curto exibido junto ao rótulo (ex.: tempo de voo). */
  badge?: string;
}

export interface Flight {
  key: string;
  from: [number, number];
  to: [number, number];
}

const ISO_NUMERIC: Record<string, string> = {
  BR: "076", AR: "032", CL: "152", PE: "604", MX: "484", US: "840", CA: "124", CU: "192", PT: "620", ES: "724",
  FR: "250", GB: "826", IT: "380", DE: "276", NL: "528", GR: "300", TR: "792", EG: "818", MA: "504", KE: "404",
  ZA: "710", AE: "784", IN: "356", CN: "156", JP: "392", TH: "764", AU: "036",
};

const W = 960;
const H = 560;

let worldCache: Promise<FeatureCollection<Geometry>> | null = null;
function loadWorld() {
  worldCache ??= fetch("/maps/countries-110m.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Mapa indisponível (${r.status})`);
      return r.json() as Promise<Topology<{ countries: GeometryCollection }>>;
    })
    .then((topo) => feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>)
    .catch((error: unknown) => {
      worldCache = null;
      throw error;
    });
  return worldCache;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return (
    document.documentElement.dataset.motion === "reduzir" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function WorldMap({
  points,
  path = [],
  flight,
  selectedId,
  onSelect,
  onFlightEnd,
  className,
  title = "Mapa-múndi da perseguição",
}: {
  points: MapPoint[];
  path?: [number, number][];
  flight?: Flight | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onFlightEnd?: () => void;
  className?: string;
  title?: string;
}) {
  const [world, setWorld] = useState<FeatureCollection<Geometry> | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [progress, setProgress] = useState(1);
  // Escala para manter rótulos e marcadores com tamanho legível em qualquer largura de tela.
  const figureRef = useRef<HTMLElement>(null);
  const [k, setK] = useState(1.6);
  useEffect(() => {
    const el = figureRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? W;
      if (width > 0) setK(Math.max(1, Math.min(2.6, W / width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const onEndRef = useRef(onFlightEnd);
  onEndRef.current = onFlightEnd;

  useEffect(() => {
    let alive = true;
    loadWorld().then(
      (w) => alive && setWorld(w),
      (e: Error) => alive && setMapError(e.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  // Enquadra os pontos com uma margem mínima, para não aproximar demais.
  const projection = useMemo(() => {
    const coords = points.map((p) => [p.lon, p.lat] as [number, number]);
    if (flight) coords.push(flight.from, flight.to);
    if (coords.length === 0) coords.push([0, 20]);
    let [minLon, maxLon] = [Math.min(...coords.map((c) => c[0])), Math.max(...coords.map((c) => c[0]))];
    let [minLat, maxLat] = [Math.min(...coords.map((c) => c[1])), Math.max(...coords.map((c) => c[1]))];
    const padLon = Math.max(12, (maxLon - minLon) * 0.18);
    const padLat = Math.max(9, (maxLat - minLat) * 0.22);
    minLon = Math.max(-180, minLon - padLon);
    maxLon = Math.min(180, maxLon + padLon);
    minLat = Math.max(-70, minLat - padLat);
    maxLat = Math.min(78, maxLat + padLat);
    const box: Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPoint", coordinates: [[minLon, minLat], [maxLon, maxLat], [minLon, maxLat], [maxLon, minLat]] },
    };
    return geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], box);
  }, [points, flight]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Animação do voo
  useEffect(() => {
    if (!flight) return;
    if (prefersReducedMotion()) {
      setProgress(1);
      onEndRef.current?.();
      return;
    }
    const duration = 2200;
    let frame = 0;
    const start = performance.now();
    setProgress(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else onEndRef.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [flight?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlighted = new Map<string, MapPoint["kind"]>();
  for (const p of points) {
    const numeric = p.countryCode ? ISO_NUMERIC[p.countryCode] : undefined;
    if (numeric && (p.kind === "current" || !highlighted.has(numeric))) highlighted.set(numeric, p.kind);
  }

  const plane = (() => {
    if (!flight || progress >= 1) return null;
    const interp = geoInterpolate(flight.from, flight.to);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
    const a = projection(interp(eased));
    const b = projection(interp(Math.min(1, eased + 0.01)));
    if (!a || !b) return null;
    const trail: [number, number][] = Array.from({ length: 24 }, (_, i) => interp((eased * i) / 23));
    return {
      x: a[0],
      y: a[1],
      angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
      trail: pathGen({ type: "LineString", coordinates: trail }) ?? "",
    };
  })();

  return (
    <figure ref={figureRef} className={cn("relative overflow-hidden rounded-xl border border-line bg-[#0b1a33]", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={title}>
        <title>{title}</title>
        <defs>
          <radialGradient id="ocean" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#12284a" />
            <stop offset="100%" stopColor="#0a1528" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#ocean)" />
        <path d={pathGen(geoGraticule10()) ?? ""} fill="none" stroke="#1d3558" strokeWidth={0.6} />

        {world?.features.map((f, i) => {
          const kind = highlighted.get(String(f.id));
          return (
            <path
              key={String(f.id ?? i)}
              d={pathGen(f) ?? ""}
              fill={kind === "current" ? "#4a3b1a" : kind === "option" ? "#1f3a5c" : kind === "visited" ? "#2a3550" : "#1c2b45"}
              stroke={kind === "current" ? "#f2b544" : "#2e4369"}
              strokeWidth={kind === "current" ? 1.2 : 0.5}
            />
          );
        })}

        {/* Caminho percorrido */}
        {path.length > 1 && (
          <path
            d={pathGen({ type: "LineString", coordinates: path }) ?? ""}
            fill="none"
            stroke="#f2b544"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        )}

        {/* Rotas possíveis a partir do local atual */}
        {(() => {
          const current = points.find((p) => p.kind === "current");
          if (!current) return null;
          return points
            .filter((p) => p.kind === "option")
            .map((p) => (
              <path
                key={`rota-${p.id}`}
                d={pathGen({ type: "LineString", coordinates: [[current.lon, current.lat], [p.lon, p.lat]] }) ?? ""}
                fill="none"
                stroke={selectedId === p.id ? "#6cb4ff" : "#3b5f8f"}
                strokeWidth={selectedId === p.id ? 2.4 : 1.2}
                strokeDasharray={selectedId === p.id ? undefined : "3 6"}
              />
            ));
        })()}

        {plane && (
          <g aria-hidden>
            <path d={plane.trail} fill="none" stroke="#ffc85c" strokeWidth={2.5} strokeLinecap="round" />
            <g transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle})`}>
              <circle r={14} fill="#f2b544" fillOpacity={0.15} />
              <path
                d="M14 0 L-6 -3 L-10 -12 L-14 -12 L-11 -2 L-14 -1 L-17 -6 L-19 -6 L-17 0 L-19 6 L-17 6 L-14 1 L-11 2 L-14 12 L-10 12 L-6 3 Z"
                fill="#ffe2a3"
                stroke="#1a1305"
                strokeWidth={1}
              />
            </g>
          </g>
        )}

        {points.map((p) => {
          const xy = projection([p.lon, p.lat]);
          if (!xy) return null;
          const [x, y] = xy;
          const clickable = p.kind === "option" && !!onSelect;
          const color = p.kind === "current" ? "#f2b544" : p.kind === "option" ? "#6cb4ff" : "#8a99b4";
          const labelLeft = x > W - 130 * k;
          return (
            <g
              key={p.id}
              transform={`translate(${x} ${y})`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={clickable ? `Selecionar destino ${p.label}${p.badge ? `, ${p.badge}` : ""}` : undefined}
              aria-pressed={clickable ? selectedId === p.id : undefined}
              onClick={clickable ? () => onSelect(p.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(p.id);
                      }
                    }
                  : undefined
              }
              className={cn(clickable && "cursor-pointer outline-none [&:focus-visible_.ring]:opacity-100")}
            >
              {clickable && <circle r={16 * k} fill="transparent" />}
              {clickable && <circle className="ring opacity-0" r={8 * k} fill="none" stroke="#ffc85c" strokeWidth={1.5 * k} />}
              {p.kind === "current" && <circle r={5 * k} fill="none" stroke="#f2b544" strokeWidth={1.5 * k} className="animate-pulse-ring" />}
              {selectedId === p.id && <circle r={9 * k} fill="none" stroke="#6cb4ff" strokeWidth={2 * k} />}
              <circle r={(p.kind === "visited" ? 3.5 : 5) * k} fill={color} stroke="#0a1120" strokeWidth={1.5 * k} />
              <text
                x={(labelLeft ? -9 : 9) * k}
                y={4.5 * k}
                textAnchor={labelLeft ? "end" : "start"}
                fontSize={(p.kind === "current" ? 15 : p.kind === "option" ? 13 : 11.5) * k}
                fontWeight={p.kind === "current" ? 700 : 600}
                fill={p.kind === "visited" ? "#b7c2d6" : "#f4f7fc"}
                stroke="#0a1120"
                strokeWidth={3 * k}
                paintOrder="stroke"
                fontFamily="ui-sans-serif, system-ui, 'Segoe UI Emoji', 'Apple Color Emoji'"
              >
                {p.emoji ? `${p.emoji} ` : ""}
                {p.label}
                {p.badge ? ` · ${p.badge}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      {!world && !mapError && (
        <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted" role="status">
          Carregando mapa…
        </p>
      )}
      {mapError && (
        <p className="absolute inset-x-0 bottom-2 text-center text-xs text-danger" role="alert">
          {mapError}
        </p>
      )}
      <figcaption className="sr-only">
        {points.map((p) => `${p.label} (${p.kind === "current" ? "local atual" : p.kind === "option" ? "destino possível" : "visitado"})`).join(", ")}
      </figcaption>
    </figure>
  );
}
