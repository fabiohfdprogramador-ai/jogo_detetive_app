import type { CaseDefinition, Condition, InvestigativeAction, Location } from "@/types/case";
import type { Evidence } from "@/types/evidence";
import type { GameSession } from "@/types/game";
import type { Suspect, SuspectStatus } from "@/types/suspect";

type Progress = Pick<
  GameSession,
  "discoveredEvidenceIds" | "completedActionIds" | "visitedLocationIds"
>;

export function isConditionMet(condition: Condition | undefined, progress: Progress): boolean {
  if (!condition) return true;
  const { evidence, anyEvidence, actions, visited } = condition;
  if (evidence && !evidence.every((id) => progress.discoveredEvidenceIds.includes(id))) return false;
  if (anyEvidence && !anyEvidence.some((id) => progress.discoveredEvidenceIds.includes(id))) return false;
  if (actions && !actions.every((id) => progress.completedActionIds.includes(id))) return false;
  if (visited && !visited.every((id) => progress.visitedLocationIds.includes(id))) return false;
  return true;
}

export function getLocation(caseDef: CaseDefinition, id: string): Location | undefined {
  return caseDef.locations.find((l) => l.id === id);
}

export function getEvidence(caseDef: CaseDefinition, id: string): Evidence | undefined {
  return caseDef.evidence.find((e) => e.id === id);
}

export function getSuspect(caseDef: CaseDefinition, id: string): Suspect | undefined {
  return caseDef.suspects.find((s) => s.id === id);
}

export function isLocationVisible(caseDef: CaseDefinition, session: Progress, locationId: string) {
  const location = getLocation(caseDef, locationId);
  return !!location && isConditionMet(location.hiddenUntil, session);
}

/** Locais visíveis no mapa para a sessão atual. */
export function getVisibleLocations(caseDef: CaseDefinition, session: Progress): Location[] {
  return caseDef.locations.filter((l) => isConditionMet(l.hiddenUntil, session));
}

/** Destinos diretamente alcançáveis a partir de um local, com o custo em minutos. */
export function getConnections(
  caseDef: CaseDefinition,
  session: Progress,
  fromId: string,
): { location: Location; minutes: number }[] {
  const result: { location: Location; minutes: number }[] = [];
  for (const [a, b, minutes] of caseDef.routes) {
    const otherId = a === fromId ? b : b === fromId ? a : null;
    if (!otherId) continue;
    const location = getLocation(caseDef, otherId);
    if (location && isConditionMet(location.hiddenUntil, session)) {
      result.push({ location, minutes });
    }
  }
  return result;
}

export function getTravelCost(caseDef: CaseDefinition, fromId: string, toId: string): number | null {
  for (const [a, b, minutes] of caseDef.routes) {
    if ((a === fromId && b === toId) || (a === toId && b === fromId)) return minutes;
  }
  return null;
}

/** Ações ainda não executadas e desbloqueadas no local informado. */
export function getAvailableActions(
  caseDef: CaseDefinition,
  session: Progress,
  locationId: string,
): InvestigativeAction[] {
  return caseDef.actions.filter(
    (a) =>
      a.locationId === locationId &&
      !session.completedActionIds.includes(a.id) &&
      isConditionMet(a.requires, session),
  );
}

export function getCompletedActions(caseDef: CaseDefinition, session: Progress, locationId: string) {
  return caseDef.actions.filter(
    (a) => a.locationId === locationId && session.completedActionIds.includes(a.id),
  );
}

/** Indica se o local ainda tem ações desbloqueadas não executadas. */
export function hasPendingActions(caseDef: CaseDefinition, session: Progress, locationId: string) {
  return getAvailableActions(caseDef, session, locationId).length > 0;
}

export function getKnownSuspects(caseDef: CaseDefinition, session: Progress): Suspect[] {
  return caseDef.suspects.filter((s) => isConditionMet(s.hiddenUntil, session));
}

/** Características conhecidas de um suspeito; desconhecidas retornam null. */
export function getKnownTraits(
  suspect: Suspect,
  session: Progress,
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(suspect.traits)) {
    const condition = suspect.hiddenTraits?.[key];
    result[key] = isConditionMet(condition, session) ? value : null;
  }
  return result;
}

/** Evidências descobertas que mencionam o suspeito. */
export function getEvidenceForSuspect(caseDef: CaseDefinition, session: Progress, suspectId: string) {
  return caseDef.evidence.filter(
    (e) => session.discoveredEvidenceIds.includes(e.id) && e.relatedSuspectIds?.includes(suspectId),
  );
}

export function getSuspectStatus(
  caseDef: CaseDefinition,
  session: GameSession,
  suspectId: string,
): SuspectStatus {
  if (session.selectedSuspectId === suspectId && session.warrant.status === "autorizado") {
    return session.status === "concluido" ? "capturado" : "identificado";
  }
  if (session.eliminatedSuspectIds.includes(suspectId)) return "descartado";
  if (session.confirmedAlibiIds.includes(suspectId)) return "alibi_confirmado";
  if (getEvidenceForSuspect(caseDef, session, suspectId).length > 0) return "circunstancial";
  return "investigado";
}

/**
 * Suspeitos compatíveis com o perfil montado pelo jogador, considerando apenas
 * características já conhecidas (não revela informação oculta).
 */
export function getProfileMatches(caseDef: CaseDefinition, session: GameSession) {
  return getKnownSuspects(caseDef, session).map((suspect) => {
    const known = getKnownTraits(suspect, session);
    let conflicts = 0;
    let unknown = 0;
    for (const [key, answer] of Object.entries(session.profile)) {
      if (!answer) continue;
      const value = known[key];
      if (value === null || value === undefined) unknown++;
      else if (value !== answer) conflicts++;
    }
    return { suspect, conflicts, unknown, compatible: conflicts === 0 };
  });
}

export function isFinished(session: GameSession) {
  return session.status === "concluido" || session.status === "parcial" || session.status === "fracasso";
}

export function elapsedMinutes(caseDef: CaseDefinition, session: GameSession) {
  return caseDef.timeBudget - Math.max(0, session.remainingTime);
}
