/**
 * Motor de investigação. Todas as funções são puras: recebem a definição do caso e a
 * sessão atual e devolvem uma nova sessão, sem efeitos colaterais (sem persistência,
 * sem acesso ao navegador). Isso permite testar as regras isoladamente e, no futuro,
 * executar a mesma validação no servidor.
 */
import type { CaseDefinition, DialogueLine } from "@/types/case";
import type {
  ActionLogEntry,
  GameSession,
  LogEntryType,
  SessionStatus,
  WarrantRequest,
} from "@/types/game";
import { t } from "@/lib/i18n";
import { createId } from "@/lib/utils/id";
import { assertTransition } from "./state-machine";
import {
  elapsedMinutes,
  getAvailableActions,
  getKnownSuspects,
  getLocation,
  getSuspect,
  getTravelCost,
  isConditionMet,
  isFinished,
} from "./selectors";

export type Tone = "sucesso" | "info" | "alerta" | "erro";

export type EngineResult =
  | {
      ok: true;
      session: GameSession;
      message: string;
      tone: Tone;
      newEvidenceIds: string[];
      dialogue?: DialogueLine[];
      narrative?: string;
    }
  | { ok: false; error: string };

interface EngineOptions {
  now?: Date;
}

const nowIso = (opts?: EngineOptions) => (opts?.now ?? new Date()).toISOString();

const fail = (error: string): EngineResult => ({ ok: false, error });

function clone(session: GameSession): GameSession {
  return structuredClone(session);
}

function log(
  caseDef: CaseDefinition,
  session: GameSession,
  entry: { type: LogEntryType; label: string; detail?: string; timeCost: number; outcome?: ActionLogEntry["outcome"] },
) {
  session.actionHistory.push({
    id: createId("log"),
    at: elapsedMinutes(caseDef, session),
    locationId: session.currentLocationId,
    ...entry,
  });
}

function transition(session: GameSession, to: SessionStatus, opts?: EngineOptions) {
  assertTransition(session.status, to);
  session.status = to;
  if (isFinished(session)) session.completedAt = nowIso(opts);
}

/** Desconta tempo e encerra a investigação caso o orçamento acabe. */
function spendTime(caseDef: CaseDefinition, session: GameSession, minutes: number, opts?: EngineOptions) {
  session.remainingTime -= minutes;
  if (session.remainingTime <= 0 && !isFinished(session)) {
    session.remainingTime = 0;
    const to: SessionStatus = session.status === "mandado_autorizado" ? "parcial" : "fracasso";
    transition(session, to, opts);
    log(caseDef, session, { type: "encerramento", label: t("engine.timeUp"), timeCost: 0, outcome: "falha" });
    return true;
  }
  return false;
}

function finishedMessage(session: GameSession, base: string) {
  return session.status === "parcial" || session.status === "fracasso" ? `${base} ${t("engine.timeUp")}` : base;
}

export function startCase(caseDef: CaseDefinition, opts?: EngineOptions): GameSession {
  const timestamp = nowIso(opts);
  const session: GameSession = {
    id: createId("sessao"),
    caseId: caseDef.id,
    status: "investigando",
    currentLocationId: caseDef.startingLocationId,
    remainingTime: caseDef.timeBudget,
    discoveredEvidenceIds: [],
    evidenceFoundAt: {},
    completedActionIds: [],
    visitedLocationIds: [caseDef.startingLocationId],
    interviewedWitnessIds: [],
    confirmedAlibiIds: [],
    eliminatedSuspectIds: [],
    flaggedEvidenceIds: [],
    evidenceLinks: [],
    profile: {},
    selectedSuspectId: null,
    warrant: { status: "nao_solicitado", attempts: 0, lastRequest: null },
    captureAttempts: 0,
    unnecessaryActions: 0,
    hintsUsed: 0,
    actionHistory: [],
    startedAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
  log(caseDef, session, { type: "inicio", label: t("log.start"), timeCost: 0, outcome: "neutro" });
  return session;
}

export function performAction(
  caseDef: CaseDefinition,
  current: GameSession,
  actionId: string,
  opts?: EngineOptions,
): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  const action = caseDef.actions.find((a) => a.id === actionId);
  if (!action) return fail(t("engine.notFound"));
  if (action.locationId !== current.currentLocationId) {
    const location = getLocation(caseDef, action.locationId);
    return fail(t("engine.actionWrongPlace", { location: location?.name ?? "outro local" }));
  }
  const available = getAvailableActions(caseDef, current, current.currentLocationId);
  if (!available.some((a) => a.id === actionId)) return fail(t("engine.actionUnavailable"));

  const session = clone(current);
  const elapsedBefore = elapsedMinutes(caseDef, session);
  session.completedActionIds.push(action.id);

  const newEvidenceIds: string[] = [];
  for (const evidenceId of action.yields?.evidenceIds ?? []) {
    if (!session.discoveredEvidenceIds.includes(evidenceId)) {
      session.discoveredEvidenceIds.push(evidenceId);
      session.evidenceFoundAt[evidenceId] = elapsedBefore + action.timeCost;
      newEvidenceIds.push(evidenceId);
    }
  }
  for (const suspectId of action.yields?.alibiConfirmed ?? []) {
    if (!session.confirmedAlibiIds.includes(suspectId)) session.confirmedAlibiIds.push(suspectId);
  }
  if (action.witnessId && !session.interviewedWitnessIds.includes(action.witnessId)) {
    session.interviewedWitnessIds.push(action.witnessId);
  }
  if (action.distraction) session.unnecessaryActions += 1;

  log(caseDef, session, {
    type: "acao",
    label: action.label,
    detail: newEvidenceIds.length > 0 ? t("engine.newEvidence", { count: newEvidenceIds.length }) : undefined,
    timeCost: action.timeCost,
    outcome: action.distraction ? "falha" : "sucesso",
  });
  spendTime(caseDef, session, action.timeCost, opts);
  session.updatedAt = nowIso(opts);

  let message = t("engine.actionDone", { label: action.label });
  if (newEvidenceIds.length > 0) message += ` ${t("engine.newEvidence", { count: newEvidenceIds.length })}`;
  if (action.distraction) message = t("engine.distraction");

  return {
    ok: true,
    session,
    message: finishedMessage(session, message),
    tone: action.distraction ? "alerta" : newEvidenceIds.length > 0 ? "sucesso" : "info",
    newEvidenceIds,
    dialogue: action.dialogue,
    narrative: action.resultText,
  };
}

export function travelTo(
  caseDef: CaseDefinition,
  current: GameSession,
  locationId: string,
  opts?: EngineOptions,
): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  const location = getLocation(caseDef, locationId);
  if (!location) return fail(t("engine.notFound"));
  if (current.currentLocationId === locationId) return fail(t("engine.alreadyHere"));
  if (!isConditionMet(location.hiddenUntil, current)) return fail(t("engine.locationHidden"));
  const cost = getTravelCost(caseDef, current.currentLocationId, locationId);
  if (cost === null) return fail(t("engine.noRoute"));

  const session = clone(current);
  log(caseDef, session, {
    type: "viagem",
    label: t("log.travel", { location: location.name }),
    timeCost: cost,
    outcome: "neutro",
  });
  session.currentLocationId = locationId;
  if (!session.visitedLocationIds.includes(locationId)) session.visitedLocationIds.push(locationId);
  spendTime(caseDef, session, cost, opts);
  session.updatedAt = nowIso(opts);

  return {
    ok: true,
    session,
    message: finishedMessage(session, t("engine.traveled", { location: location.name })),
    tone: "info",
    newEvidenceIds: [],
  };
}

/** Marca ou desmarca um suspeito como descartado pelo jogador. Não consome tempo. */
export function toggleSuspectEliminated(
  caseDef: CaseDefinition,
  current: GameSession,
  suspectId: string,
  opts?: EngineOptions,
): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  const suspect = getSuspect(caseDef, suspectId);
  if (!suspect || !isConditionMet(suspect.hiddenUntil, current)) return fail(t("engine.notFound"));
  const session = clone(current);
  const index = session.eliminatedSuspectIds.indexOf(suspectId);
  const eliminated = index === -1;
  if (eliminated) session.eliminatedSuspectIds.push(suspectId);
  else session.eliminatedSuspectIds.splice(index, 1);
  log(caseDef, session, {
    type: "anotacao",
    label: eliminated ? `Descartou ${suspect.name}` : `Reconsiderou ${suspect.name}`,
    timeCost: 0,
    outcome: "neutro",
  });
  session.updatedAt = nowIso(opts);
  return {
    ok: true,
    session,
    message: t(eliminated ? "engine.suspectEliminated" : "engine.suspectRestored", { name: suspect.name }),
    tone: "info",
    newEvidenceIds: [],
  };
}

export function toggleEvidenceFlag(current: GameSession, evidenceId: string, opts?: EngineOptions): EngineResult {
  if (!current.discoveredEvidenceIds.includes(evidenceId)) return fail(t("engine.notFound"));
  const session = clone(current);
  const index = session.flaggedEvidenceIds.indexOf(evidenceId);
  if (index === -1) session.flaggedEvidenceIds.push(evidenceId);
  else session.flaggedEvidenceIds.splice(index, 1);
  session.updatedAt = nowIso(opts);
  return { ok: true, session, message: "", tone: "info", newEvidenceIds: [] };
}

/** Cria ou remove uma relação entre duas evidências no quadro do jogador. */
export function toggleEvidenceLink(
  current: GameSession,
  a: string,
  b: string,
  opts?: EngineOptions,
): EngineResult {
  if (a === b) return fail(t("engine.linkSelf"));
  if (!current.discoveredEvidenceIds.includes(a) || !current.discoveredEvidenceIds.includes(b)) {
    return fail(t("engine.notFound"));
  }
  const session = clone(current);
  const index = session.evidenceLinks.findIndex(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  const created = index === -1;
  if (created) session.evidenceLinks.push([a, b]);
  else session.evidenceLinks.splice(index, 1);
  session.updatedAt = nowIso(opts);
  return {
    ok: true,
    session,
    message: t(created ? "engine.linkCreated" : "engine.linkRemoved"),
    tone: "info",
    newEvidenceIds: [],
  };
}

export function setProfileAnswer(
  caseDef: CaseDefinition,
  current: GameSession,
  traitKey: string,
  value: string | null,
  opts?: EngineOptions,
): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  const trait = caseDef.traits.find((tr) => tr.key === traitKey);
  if (!trait) return fail(t("engine.notFound"));
  if (value !== null && !trait.options.some((o) => o.value === value)) return fail(t("engine.notFound"));
  const session = clone(current);
  if (value === null) delete session.profile[traitKey];
  else session.profile[traitKey] = value;
  session.updatedAt = nowIso(opts);
  return { ok: true, session, message: "", tone: "info", newEvidenceIds: [] };
}

/**
 * Pedido de mandado. É concedido somente quando o suspeito indicado é o responsável,
 * o perfil apresentado está correto nas características exigidas e as evidências
 * obrigatórias já foram coletadas. A resposta negativa é sempre a mesma, para não
 * revelar qual dos requisitos falhou.
 */
export function requestWarrant(
  caseDef: CaseDefinition,
  current: GameSession,
  request: WarrantRequest,
  opts?: EngineOptions,
): EngineResult {
  if (current.status !== "investigando") return fail(t("engine.warrantNotNow"));
  const rules = caseDef.completionRules;
  const suspect = getKnownSuspects(caseDef, current).find((s) => s.id === request.suspectId);
  if (!suspect) return fail(t("engine.warrantSuspectUnknown"));
  if (current.discoveredEvidenceIds.length < rules.minEvidenceForWarrant) {
    return fail(t("engine.warrantTooEarly", { count: rules.minEvidenceForWarrant }));
  }
  const cited = [...new Set(request.citedEvidenceIds)];
  if (cited.some((id) => !current.discoveredEvidenceIds.includes(id))) {
    return fail(t("engine.warrantCiteUnknown"));
  }
  if (cited.length < rules.minCitedEvidence) {
    return fail(t("engine.warrantCiteMore", { count: rules.minCitedEvidence }));
  }
  if (caseDef.traits.some((trait) => !request.traitAnswers[trait.key])) {
    return fail(t("engine.warrantProfileIncomplete"));
  }

  const { solution } = caseDef;
  const culprit = getSuspect(caseDef, solution.culpritId);
  const granted =
    !!culprit &&
    suspect.id === culprit.id &&
    solution.requiredTraits.every((key) => request.traitAnswers[key] === culprit.traits[key]) &&
    solution.requiredEvidenceIds.every((id) => current.discoveredEvidenceIds.includes(id));

  const session = clone(current);
  session.warrant.attempts += 1;
  session.warrant.lastRequest = { ...request, citedEvidenceIds: cited };
  session.profile = { ...request.traitAnswers };

  if (granted) {
    session.warrant.status = "autorizado";
    session.selectedSuspectId = suspect.id;
    transition(session, "mandado_autorizado", opts);
    log(caseDef, session, {
      type: "mandado",
      label: t("log.warrantGranted"),
      detail: suspect.name,
      timeCost: rules.warrantTimeCost,
      outcome: "sucesso",
    });
    spendTime(caseDef, session, rules.warrantTimeCost, opts);
    session.updatedAt = nowIso(opts);
    return {
      ok: true,
      session,
      message: finishedMessage(session, t("engine.warrantGranted", { name: suspect.name })),
      tone: "sucesso",
      newEvidenceIds: [],
    };
  }

  session.warrant.status = "negado";
  log(caseDef, session, {
    type: "mandado",
    label: t("log.warrantDenied"),
    detail: suspect.name,
    timeCost: rules.warrantTimeCost + rules.wrongWarrantTimePenalty,
    outcome: "falha",
  });
  let message = t("engine.warrantDenied", { name: suspect.name });
  if (session.warrant.attempts >= rules.maxWarrantAttempts) {
    transition(session, "fracasso", opts);
    log(caseDef, session, { type: "encerramento", label: t("log.end"), timeCost: 0, outcome: "falha" });
    message = `${message} ${t("engine.warrantExhausted")}`;
  } else {
    spendTime(caseDef, session, rules.warrantTimeCost + rules.wrongWarrantTimePenalty, opts);
    message = finishedMessage(session, message);
  }
  session.updatedAt = nowIso(opts);
  return { ok: true, session, message, tone: "erro", newEvidenceIds: [] };
}

/** Tenta capturar o suspeito no local atual. Exige mandado autorizado. */
export function attemptCapture(caseDef: CaseDefinition, current: GameSession, opts?: EngineOptions): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  if (current.status !== "mandado_autorizado") return fail(t("engine.captureNoWarrant"));
  const rules = caseDef.completionRules;
  const location = getLocation(caseDef, current.currentLocationId);
  const session = clone(current);
  session.captureAttempts += 1;

  if (current.currentLocationId === caseDef.solution.captureLocationId) {
    log(caseDef, session, {
      type: "captura",
      label: t("log.captureSuccess"),
      detail: location?.name,
      timeCost: rules.captureTimeCost,
      outcome: "sucesso",
    });
    session.remainingTime = Math.max(0, session.remainingTime - rules.captureTimeCost);
    transition(session, "concluido", opts);
    session.updatedAt = nowIso(opts);
    return {
      ok: true,
      session,
      message: t("engine.captureSuccess", { location: location?.name ?? "" }),
      tone: "sucesso",
      newEvidenceIds: [],
    };
  }

  log(caseDef, session, {
    type: "captura",
    label: t("log.captureMiss"),
    detail: location?.name,
    timeCost: rules.captureTimeCost + rules.wrongCaptureTimePenalty,
    outcome: "falha",
  });
  let message = t("engine.captureMiss", { location: location?.name ?? "" });
  if (session.captureAttempts >= rules.maxCaptureAttempts) {
    transition(session, "parcial", opts);
    log(caseDef, session, { type: "encerramento", label: t("log.end"), timeCost: 0, outcome: "falha" });
    message = `${message} ${t("engine.captureEscaped")}`;
  } else {
    spendTime(caseDef, session, rules.captureTimeCost + rules.wrongCaptureTimePenalty, opts);
    message = finishedMessage(session, message);
  }
  session.updatedAt = nowIso(opts);
  return { ok: true, session, message, tone: "erro", newEvidenceIds: [] };
}

/** Libera a próxima dica do caso. Retorna o texto da dica na narrativa. */
export function revealHint(
  caseDef: CaseDefinition,
  current: GameSession,
  opts?: EngineOptions & { hintsEnabled?: boolean },
): EngineResult {
  if (isFinished(current)) return fail(t("engine.finished"));
  if (opts?.hintsEnabled === false) return fail(t("engine.hintsDisabled"));
  const hint = caseDef.hints[current.hintsUsed];
  if (!hint) return fail(t("engine.hintNone"));
  const session = clone(current);
  session.hintsUsed += 1;
  log(caseDef, session, {
    type: "dica",
    label: t("log.hint", { level: session.hintsUsed }),
    timeCost: 0,
    outcome: "neutro",
  });
  session.updatedAt = nowIso(opts);
  return {
    ok: true,
    session,
    message: t("engine.hintUsed", { level: session.hintsUsed, penalty: hint.penalty }),
    tone: "alerta",
    newEvidenceIds: [],
    narrative: hint.text,
  };
}
