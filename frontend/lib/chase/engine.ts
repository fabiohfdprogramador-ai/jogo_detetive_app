/**
 * Regras do Modo Perseguição. Funções puras: recebem a sessão e devolvem uma nova.
 *
 * Tempo: visitar um lugar custa 2 h, 3 h e 4 h (1ª, 2ª e 3ª visita na mesma cidade).
 * Voos custam 1 h + 1 h a cada 800 km (mínimo 2 h). Entre 23h e 7h o agente dorme.
 * O prazo é domingo às 17h.
 */
import type { ChaseSession, ChaseSpot, ChaseStatus, TraitKey } from "@/types/chase";
import { createId } from "@/lib/utils/id";
import { distanceKm } from "@/data/world/cities";
import { getChaseSuspect, traitOption } from "@/data/world/suspects";
import { cityOf, generateChase, matchingSuspectIds } from "./generator";

export type ChaseResult =
  | {
      ok: true;
      session: ChaseSession;
      message: string;
      tone: "sucesso" | "info" | "alerta" | "erro";
      spot?: ChaseSpot;
      slept?: boolean;
      hours?: number;
    }
  | { ok: false; error: string };

const fail = (error: string): ChaseResult => ({ ok: false, error });

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function formatChaseClock(hour: number, short = false): string {
  const day = DAYS[Math.min(DAYS.length - 1, Math.floor(hour / 24))]!;
  const hh = String(Math.floor(hour % 24)).padStart(2, "0");
  return `${short ? day.slice(0, 3) : day}, ${hh}:00`;
}

/** Avança o relógio; se cair na madrugada, o agente dorme até as 7h. */
export function advanceClock(hour: number, cost: number): { hour: number; slept: boolean } {
  const h = hour + cost;
  const tod = h % 24;
  if (tod >= 23) return { hour: (Math.floor(h / 24) + 1) * 24 + 7, slept: true };
  if (tod < 7) return { hour: Math.floor(h / 24) * 24 + 7, slept: true };
  return { hour: h, slept: false };
}

export function flightHours(fromId: string, toId: string): number {
  return Math.max(2, 1 + Math.round(distanceKm(cityOf(fromId), cityOf(toId)) / 800));
}

export function spotCost(session: ChaseSession): number {
  return 2 + (session.visitedSpots[session.currentCityId]?.length ?? 0);
}

export function isChaseFinished(session: ChaseSession) {
  return session.status !== "ativo";
}

function finish(session: ChaseSession, status: ChaseStatus, now: Date) {
  session.status = status;
  session.finishedAt = now.toISOString();
}

function log(session: ChaseSession, emoji: string, text: string) {
  session.log.push({ hour: session.hour, emoji, text });
}

/** Aplica o custo de tempo e verifica o prazo. */
function spend(session: ChaseSession, cost: number, now: Date) {
  const { hour, slept } = advanceClock(session.hour, cost);
  session.hour = hour;
  if (slept) log(session, "😴", "Noite de descanso no hotel.");
  if (session.hour >= session.case.deadlineHour) {
    session.hour = session.case.deadlineHour;
    finish(session, "tempo_esgotado", now);
    log(session, "⌛", "O prazo acabou. O suspeito escapou.");
  }
  return slept;
}

export function startChase(seed: number, rankIndex: number, now = new Date()): ChaseSession {
  const chaseCase = generateChase(seed, rankIndex);
  const start = chaseCase.route[0]!;
  return {
    id: createId("perseguicao"),
    case: chaseCase,
    status: "ativo",
    currentCityId: start,
    hour: chaseCase.startHour,
    path: [start],
    visitedSpots: {},
    notes: [],
    traitFilter: { sexo: getChaseSuspect(chaseCase.culpritId)!.traits.sexo },
    warrantSuspectId: null,
    log: [{ hour: chaseCase.startHour, emoji: "📰", text: `Plantão: ${chaseCase.item.name} foi roubado(a) em ${cityOf(start).name}.` }],
    startedAt: now.toISOString(),
    finishedAt: null,
  };
}

export function investigate(current: ChaseSession, spotId: string, now = new Date()): ChaseResult {
  if (isChaseFinished(current)) return fail("Esta missão já terminou.");
  const stop = current.case.stops[current.currentCityId];
  const spot = stop?.spots.find((s) => s.id === spotId);
  if (!stop || !spot) return fail("Este lugar não existe nesta cidade.");

  const visited = current.visitedSpots[current.currentCityId] ?? [];
  if (visited.includes(spotId)) {
    return { ok: true, session: current, message: "Você relê suas anotações deste lugar.", tone: "info", spot, hours: 0 };
  }

  const session = structuredClone(current);
  const cost = spotCost(session);
  session.visitedSpots[session.currentCityId] = [...visited, spotId];
  const slept = spend(session, cost, now);
  if (isChaseFinished(session)) {
    return { ok: true, session, message: "O tempo acabou antes que você terminasse a conversa.", tone: "erro", spot, slept, hours: cost };
  }

  const city = cityOf(session.currentCityId);
  if (spot.hideout) {
    const culprit = getChaseSuspect(session.case.culpritId)!;
    if (session.warrantSuspectId === culprit.id) {
      finish(session, "capturado", now);
      log(session, "🚔", `${culprit.name} foi preso(a) em ${city.name}!`);
      return { ok: true, session, message: `Você prendeu ${culprit.name} em ${city.name}!`, tone: "sucesso", spot, slept, hours: cost };
    }
    if (session.warrantSuspectId) {
      const wrong = getChaseSuspect(session.warrantSuspectId)!;
      finish(session, "prisao_errada", now);
      log(session, "⛓️", `O mandado era contra ${wrong.name}, mas quem estava lá era ${culprit.name}. A pessoa errada foi detida e o verdadeiro culpado fugiu.`);
      return { ok: true, session, message: `O mandado estava em nome de ${wrong.name}. ${culprit.name} escapou!`, tone: "erro", spot, slept, hours: cost };
    }
    finish(session, "fugiu", now);
    log(session, "💨", `${culprit.name} estava lá, mas sem mandado você não pôde prender.`);
    return { ok: true, session, message: `${culprit.name} estava lá, mas sem mandado não houve prisão. Fugiu!`, tone: "erro", spot, slept, hours: cost };
  }

  spot.lines.forEach((line, index) => {
    const base = stop.kind === "despiste" ? "nada" : stop.kind === "final" ? "aviso" : "destino";
    const kind = index === 0 ? base : line.startsWith("🥷") ? "aviso" : "suspeito";
    session.notes.push({ cityId: session.currentCityId, spotId, text: line, kind });
  });
  log(session, spot.witness.emoji, `Conversou com ${spot.witness.role.toLowerCase()} em ${city.name}.`);
  return {
    ok: true,
    session,
    message: stop.kind === "despiste" ? "Ninguém viu o suspeito por aqui." : "Nova pista anotada no caderno.",
    tone: stop.kind === "despiste" ? "alerta" : "info",
    spot,
    slept,
    hours: cost,
  };
}

export function travel(current: ChaseSession, cityId: string, now = new Date()): ChaseResult {
  if (isChaseFinished(current)) return fail("Esta missão já terminou.");
  const stop = current.case.stops[current.currentCityId];
  if (!stop?.connections.includes(cityId)) return fail("Não há voo para essa cidade a partir daqui.");
  const session = structuredClone(current);
  const hours = flightHours(session.currentCityId, cityId);
  const from = cityOf(session.currentCityId);
  const to = cityOf(cityId);
  session.currentCityId = cityId;
  session.path.push(cityId);
  log(session, "✈️", `Voo de ${from.name} para ${to.name} (${hours} h).`);
  const slept = spend(session, hours, now);
  return {
    ok: true,
    session,
    message: isChaseFinished(session) ? "O prazo terminou durante o voo." : `Você chegou a ${to.name}.`,
    tone: isChaseFinished(session) ? "erro" : "info",
    slept,
    hours,
  };
}

export function setTraitFilter(current: ChaseSession, trait: TraitKey, value: string | null): ChaseResult {
  if (isChaseFinished(current)) return fail("Esta missão já terminou.");
  if (value !== null && !traitOption(trait, value)) return fail("Valor inválido.");
  const session = structuredClone(current);
  if (value === null) delete session.traitFilter[trait];
  else session.traitFilter[trait] = value;
  return { ok: true, session, message: "", tone: "info" };
}

/** Emite o mandado se o filtro da Central de Dados apontar exatamente um suspeito. */
export function issueWarrant(current: ChaseSession): ChaseResult {
  if (isChaseFinished(current)) return fail("Esta missão já terminou.");
  const matches = matchingSuspectIds(current.traitFilter);
  if (matches.length === 0) return fail("Nenhum membro da Rede Mariposa combina com essas características.");
  if (matches.length > 1) return fail(`${matches.length} suspeitos combinam. Refine as características para sobrar apenas um.`);
  const suspect = getChaseSuspect(matches[0]!)!;
  const session = structuredClone(current);
  session.warrantSuspectId = suspect.id;
  log(session, "📜", `Mandado de prisão emitido contra ${suspect.name}.`);
  return { ok: true, session, message: `Mandado emitido contra ${suspect.name}!`, tone: "sucesso" };
}

export function chaseScore(session: ChaseSession): number {
  if (session.status !== "capturado") return 0;
  const remaining = Math.max(0, session.case.deadlineHour - session.hour);
  return 500 + remaining * 10 + session.case.rankIndex * 100;
}

export function newChase(rankIndex: number, seed = Math.floor(Math.random() * 2 ** 31), now = new Date()) {
  return startChase(seed, rankIndex, now);
}
