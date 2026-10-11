import { describe, expect, it } from "vitest";
import { generateChase, matchingSuspectIds } from "@/lib/chase/generator";
import {
  advanceClock,
  chaseScore,
  flightHours,
  formatChaseClock,
  investigate,
  issueWarrant,
  setTraitFilter,
  startChase,
  travel,
  type ChaseResult,
} from "@/lib/chase/engine";
import { CITIES, getCity } from "@/data/world/cities";
import { RANKS, SUSPECTS, getChaseSuspect, rankIndexFor } from "@/data/world/suspects";
import type { ChaseSession, TraitKey } from "@/types/chase";

function ok(result: ChaseResult) {
  if (!result.ok) throw new Error(result.error);
  return result.session;
}

/** Robô que joga "perfeitamente": visita todos os lugares e segue a rota correta. */
function playPerfect(seed: number, rank: number, detours = 0): ChaseSession {
  let s = startChase(seed, rank);
  const { route, culpritId, revealedTraits } = s.case;
  const culprit = getChaseSuspect(culpritId)!;
  for (let i = 0; i < route.length - 1; i++) {
    for (const spot of s.case.stops[route[i]!]!.spots) s = ok(investigate(s, spot.id));
    if (i < detours) {
      const decoy = s.case.stops[route[i]!]!.connections.find((c) => s.case.stops[c]?.kind === "despiste")!;
      s = ok(travel(s, decoy));
      s = ok(investigate(s, s.case.stops[decoy]!.spots[0]!.id));
      s = ok(travel(s, route[i]!));
    }
    s = ok(travel(s, route[i + 1]!));
    if (s.status !== "ativo") return s;
  }
  for (const key of revealedTraits) s = ok(setTraitFilter(s, key, culprit.traits[key]));
  s = ok(issueWarrant(s));
  for (const spot of s.case.stops[route[route.length - 1]!]!.spots) {
    s = ok(investigate(s, spot.id));
    if (s.status !== "ativo") break;
  }
  return s;
}

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 13);

describe("dados do mundo", () => {
  it("tem 30 cidades com ids únicos e coordenadas válidas", () => {
    expect(CITIES.length).toBe(30);
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(30);
    for (const c of CITIES) {
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
      expect(c.turismo.length + c.comida.length + c.geografia.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("cada suspeito é único dentro do próprio sexo", () => {
    const keys = SUSPECTS.map((s) => JSON.stringify(s.traits));
    expect(new Set(keys).size).toBe(SUSPECTS.length);
  });
});

describe("gerador de missões", () => {
  it("é determinístico pela semente", () => {
    expect(generateChase(42, 2)).toEqual(generateChase(42, 2));
    expect(generateChase(42, 2)).not.toEqual(generateChase(43, 2));
  });

  it.each(RANKS.map((r, i) => [r.name, i] as const))("gera missões consistentes para a patente %s", (_name, rank) => {
    for (const seed of SEEDS) {
      const c = generateChase(seed, rank);
      expect(c.route.length).toBe(RANKS[rank]!.stops);
      expect(new Set(c.route).size).toBe(c.route.length);
      const culprit = getChaseSuspect(c.culpritId)!;

      // As características reveladas identificam exatamente o responsável.
      const filter: Partial<Record<TraitKey, string>> = { sexo: culprit.traits.sexo };
      for (const k of c.revealedTraits) filter[k] = culprit.traits[k];
      expect(matchingSuspectIds(filter)).toEqual([culprit.id]);

      // Toda característica revelada aparece em alguma testemunha da rota.
      const routeSpots = c.route.flatMap((id) => c.stops[id]!.spots);
      for (const k of c.revealedTraits) {
        expect(routeSpots.some((s) => s.traitClue?.trait === k && s.traitClue.value === culprit.traits[k])).toBe(true);
      }

      c.route.forEach((id, i) => {
        const stop = c.stops[id]!;
        const next = c.route[i + 1];
        expect(stop.spots).toHaveLength(3);
        if (next) {
          expect(stop.kind).toBe("rota");
          expect(stop.connections).toContain(next);
          expect(getCity(id)!.countryCode).not.toBe(getCity(next)!.countryCode);
          for (const other of stop.connections.filter((x) => x !== next && x !== c.route[i - 1])) {
            expect(c.stops[other]!.kind).toBe("despiste");
            expect(getCity(other)!.countryCode).not.toBe(getCity(next)!.countryCode);
          }
        } else {
          expect(stop.kind).toBe("final");
          expect(stop.spots.filter((s) => s.hideout)).toHaveLength(1);
        }
      });
    }
  });
});

describe("relógio", () => {
  it("formata e aplica a noite de sono", () => {
    expect(formatChaseClock(9)).toBe("Segunda, 09:00");
    expect(formatChaseClock(6 * 24 + 17)).toBe("Domingo, 17:00");
    expect(formatChaseClock(RANKS[0]!.deadline)).toBe("Sábado, 17:00");
    expect(advanceClock(9, 3)).toEqual({ hour: 12, slept: false });
    expect(advanceClock(21, 3)).toEqual({ hour: 31, slept: true }); // terça 07:00
    expect(advanceClock(20, 10)).toEqual({ hour: 31, slept: true });
  });

  it("calcula voos proporcionais à distância", () => {
    expect(flightHours("rio", "saopaulo")).toBe(2);
    expect(flightHours("rio", "toquio")).toBeGreaterThan(flightHours("rio", "lisboa"));
  });
});

describe("jogabilidade", () => {
  it("uma investigação perfeita sempre termina em captura, em todas as patentes", () => {
    for (let rank = 0; rank < RANKS.length; rank++) {
      for (const seed of SEEDS) {
        const s = playPerfect(seed, rank);
        expect(s.status, `semente ${seed}, patente ${rank}`).toBe("capturado");
        expect(chaseScore(s)).toBeGreaterThan(0);
      }
    }
  });

  it("ainda dá para vencer errando um destino nas patentes iniciais", () => {
    for (const seed of SEEDS) expect(playPerfect(seed, 0, 1).status).toBe("capturado");
  });

  it("cidades de despiste não têm pistas e só levam de volta", () => {
    let s = startChase(7, 0);
    const start = s.case.route[0]!;
    const decoy = s.case.stops[start]!.connections.find((c) => c !== s.case.route[1])!;
    s = ok(travel(s, decoy));
    const r = investigate(s, s.case.stops[decoy]!.spots[0]!.id);
    if (!r.ok) throw new Error(r.error);
    expect(r.tone).toBe("alerta");
    expect(r.session.notes.at(-1)?.kind).toBe("nada");
    expect(travel(r.session, s.case.route[1]!).ok).toBe(false);
    expect(travel(r.session, start).ok).toBe(true);
  });

  it("revisitar um lugar não custa tempo; visitas novas custam cada vez mais", () => {
    let s = startChase(11, 0);
    const spots = s.case.stops[s.currentCityId]!.spots;
    const h0 = s.hour;
    s = ok(investigate(s, spots[0]!.id));
    expect(s.hour - h0).toBe(2);
    const h1 = s.hour;
    s = ok(investigate(s, spots[0]!.id));
    expect(s.hour).toBe(h1);
    s = ok(investigate(s, spots[1]!.id));
    expect(s.hour - h1).toBe(3);
  });

  it("mandado exige um único suspeito compatível", () => {
    let s = startChase(5, 0);
    expect(issueWarrant(s).ok).toBe(false); // só o sexo: 6 suspeitos
    const culprit = getChaseSuspect(s.case.culpritId)!;
    for (const k of ["cabelo", "hobby", "marca", "veiculo"] as TraitKey[]) s = ok(setTraitFilter(s, k, culprit.traits[k]));
    s = ok(issueWarrant(s));
    expect(s.warrantSuspectId).toBe(culprit.id);
    expect(setTraitFilter(s, "cabelo", "azul").ok).toBe(false);
  });

  it("sem mandado o suspeito foge; com mandado errado, prisão errada", () => {
    const reachFinal = (seed: number) => {
      let s = startChase(seed, 0);
      for (let i = 1; i < s.case.route.length; i++) s = ok(travel(s, s.case.route[i]!));
      return s;
    };
    let s = reachFinal(99);
    const hideout = s.case.stops[s.currentCityId]!.spots.find((x) => x.hideout)!;
    expect(ok(investigate(s, hideout.id)).status).toBe("fugiu");

    s = reachFinal(99);
    const culprit = getChaseSuspect(s.case.culpritId)!;
    const other = SUSPECTS.find((x) => x.id !== culprit.id)!;
    for (const [k, v] of Object.entries(other.traits)) s = ok(setTraitFilter(s, k as TraitKey, v));
    s = ok(issueWarrant(s));
    expect(ok(investigate(s, hideout.id)).status).toBe("prisao_errada");
  });

  it("termina por tempo esgotado e bloqueia novas ações", () => {
    let s = startChase(3, 0);
    s = { ...s, hour: s.case.deadlineHour - 1 };
    s = ok(investigate(s, s.case.stops[s.currentCityId]!.spots[0]!.id));
    expect(s.status).toBe("tempo_esgotado");
    expect(travel(s, s.case.route[1]!).ok).toBe(false);
  });

  it("patente sobe com casos resolvidos", () => {
    expect(rankIndexFor(0)).toBe(0);
    expect(rankIndexFor(1)).toBe(1);
    expect(rankIndexFor(100)).toBe(RANKS.length - 1);
  });
});
