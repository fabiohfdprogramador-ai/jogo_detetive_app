import type { CaseDefinition } from "@/types/case";
import type { CaseAvailability, SaveData } from "@/types/game";
import { ALL_CASES } from "@/data/cases";
import { isFinished } from "./selectors";

export function listCases(): CaseDefinition[] {
  return [...ALL_CASES].sort((a, b) => a.order - b.order);
}

export function getCaseById(id: string): CaseDefinition | undefined {
  return ALL_CASES.find((c) => c.id === id || c.slug === id);
}

/** Um caso conta como solucionado quando o responsável foi identificado (captura ou não). */
export function isCaseSolved(save: SaveData, caseId: string): boolean {
  const record = save.records[caseId];
  return !!record && record.successes + record.partials > 0;
}

export function getCaseAvailability(save: SaveData, caseDef: CaseDefinition): CaseAvailability {
  if (!caseDef.unlockAfter.every((id) => isCaseSolved(save, id))) return "bloqueado";
  const session = save.sessions[caseDef.id];
  if (session && !isFinished(session)) return "em_andamento";
  if ((save.records[caseDef.id]?.successes ?? 0) > 0) return "concluido";
  return "disponivel";
}

/** Explica por que um caso está bloqueado. */
export function getLockReason(save: SaveData, caseDef: CaseDefinition): string | null {
  const missing = caseDef.unlockAfter.filter((id) => !isCaseSolved(save, id));
  if (missing.length === 0) return null;
  const titles = missing.map((id) => `“${getCaseById(id)?.title ?? id}”`).join(", ");
  return `Identifique o responsável em ${titles} para liberar este caso.`;
}
