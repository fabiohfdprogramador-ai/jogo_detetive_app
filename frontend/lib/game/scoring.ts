/**
 * Pontuação de uma investigação.
 *
 * Fórmula (valores padrão em DEFAULT_SCORING, sobrescrevíveis por caso em `scoringRules`):
 *
 *   + identificação     se o mandado foi concedido
 *   + captura           se o caso foi concluído com captura
 *   + evidências        evidenceMax × (evidências "chave"/"relevante" encontradas ÷ total delas)
 *   + dedução           deductionMax × qualidade das evidências citadas no mandado
 *                       (citadas que sustentam a solução ÷ total que sustenta, −25% por evidência enganosa citada)
 *   + tempo             timeMax × (tempo restante ÷ orçamento), apenas com captura
 *   + objetivos         secondaryObjective por objetivo secundário cumprido
 *   − dicas             soma das penalidades das dicas usadas
 *   − mandados negados  wrongWarrantPenalty por pedido negado
 *   − capturas erradas  wrongCapturePenalty por tentativa frustrada
 *   − ações inúteis     unnecessaryActionPenalty por ação desnecessária
 *
 * O total é limitado ao intervalo [0, máximo possível].
 */
import type { CaseDefinition, ScoringRules } from "@/types/case";
import type { GameSession, PerformanceRating, ScoreLine, ScoreResult } from "@/types/game";
import { t } from "@/lib/i18n";
import { isConditionMet } from "./selectors";

export const DEFAULT_SCORING: ScoringRules = {
  identification: 400,
  capture: 300,
  evidenceMax: 200,
  deductionMax: 100,
  timeMax: 150,
  secondaryObjective: 50,
  wrongWarrantPenalty: 100,
  wrongCapturePenalty: 50,
  unnecessaryActionPenalty: 10,
};

export function getScoringRules(caseDef: CaseDefinition): ScoringRules {
  return { ...DEFAULT_SCORING, ...caseDef.scoringRules };
}

export function maxScore(caseDef: CaseDefinition): number {
  const r = getScoringRules(caseDef);
  return (
    r.identification +
    r.capture +
    r.evidenceMax +
    r.deductionMax +
    r.timeMax +
    r.secondaryObjective * caseDef.secondaryObjectives.length
  );
}

export function isSecondaryObjectiveMet(
  caseDef: CaseDefinition,
  session: GameSession,
  objectiveId: string,
): boolean {
  const objective = caseDef.secondaryObjectives.find((o) => o.id === objectiveId);
  if (!objective) return false;
  if (objective.minRemainingTime !== undefined) {
    if (session.status !== "concluido" || session.remainingTime < objective.minRemainingTime) return false;
  }
  return isConditionMet(objective.condition, session);
}

export function deductionQuality(caseDef: CaseDefinition, session: GameSession): number {
  const cited = session.warrant.status === "autorizado" ? session.warrant.lastRequest?.citedEvidenceIds ?? [] : [];
  const supporting = new Set([...caseDef.solution.supportingEvidenceIds, ...caseDef.solution.requiredEvidenceIds]);
  if (supporting.size === 0) return 0;
  const good = cited.filter((id) => supporting.has(id)).length;
  const misleading = cited.filter(
    (id) => caseDef.evidence.find((e) => e.id === id)?.relevance === "enganosa",
  ).length;
  return Math.max(0, Math.min(1, good / supporting.size - 0.25 * misleading));
}

export function ratingFor(session: GameSession, total: number, max: number): PerformanceRating {
  if (session.status !== "concluido") return "inconclusivo";
  const ratio = max > 0 ? total / max : 0;
  if (ratio >= 0.8) return "elite";
  if (ratio >= 0.55) return "agente_de_campo";
  return "em_formacao";
}

export function calculateScore(caseDef: CaseDefinition, session: GameSession): ScoreResult {
  const r = getScoringRules(caseDef);
  const lines: ScoreLine[] = [];
  const identified = session.warrant.status === "autorizado";
  const captured = session.status === "concluido";

  lines.push({ label: t("score.identification"), points: identified ? r.identification : 0 });
  lines.push({ label: t("score.capture"), points: captured ? r.capture : 0 });

  const relevant = caseDef.evidence.filter((e) => e.relevance === "chave" || e.relevance === "relevante");
  const found = relevant.filter((e) => session.discoveredEvidenceIds.includes(e.id)).length;
  lines.push({
    label: t("score.evidence"),
    points: relevant.length ? Math.round((r.evidenceMax * found) / relevant.length) : 0,
    detail: `${found} de ${relevant.length}`,
  });

  const quality = deductionQuality(caseDef, session);
  lines.push({
    label: t("score.deduction"),
    points: Math.round(r.deductionMax * quality),
    detail: `${Math.round(quality * 100)}%`,
  });

  const timeRatio = captured ? Math.max(0, session.remainingTime) / caseDef.timeBudget : 0;
  lines.push({
    label: t("score.time"),
    points: Math.round(r.timeMax * timeRatio),
    detail: captured ? `${Math.round(timeRatio * 100)}% do orçamento` : "sem captura",
  });

  for (const objective of caseDef.secondaryObjectives) {
    if (isSecondaryObjectiveMet(caseDef, session, objective.id)) {
      lines.push({ label: t("score.secondary"), points: r.secondaryObjective, detail: objective.description });
    }
  }

  const hintPenalty = caseDef.hints.slice(0, session.hintsUsed).reduce((sum, h) => sum + h.penalty, 0);
  if (hintPenalty > 0) {
    lines.push({ label: t("score.hints"), points: -hintPenalty, detail: `${session.hintsUsed} dica(s)` });
  }
  const deniedWarrants = session.warrant.attempts - (identified ? 1 : 0);
  if (deniedWarrants > 0) {
    lines.push({
      label: t("score.wrongWarrant"),
      points: -deniedWarrants * r.wrongWarrantPenalty,
      detail: `${deniedWarrants}×`,
    });
  }
  const missedCaptures = session.captureAttempts - (captured ? 1 : 0);
  if (missedCaptures > 0) {
    lines.push({
      label: t("score.wrongCapture"),
      points: -missedCaptures * r.wrongCapturePenalty,
      detail: `${missedCaptures}×`,
    });
  }
  if (session.unnecessaryActions > 0) {
    lines.push({
      label: t("score.unnecessary"),
      points: -session.unnecessaryActions * r.unnecessaryActionPenalty,
      detail: `${session.unnecessaryActions}×`,
    });
  }

  const max = maxScore(caseDef);
  const raw = lines.reduce((sum, line) => sum + line.points, 0);
  const total = Math.max(0, Math.min(max, raw));
  return { lines, total, max, rating: ratingFor(session, total, max) };
}
