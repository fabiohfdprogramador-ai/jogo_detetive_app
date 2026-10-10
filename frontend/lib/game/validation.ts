/**
 * Verificações de consistência dos dados de um caso. Usadas nos testes automatizados
 * para garantir que cada caso é solucionável e livre de referências quebradas.
 */
import type { CaseDefinition, Condition } from "@/types/case";
import { isConditionMet } from "./selectors";

export function validateCase(caseDef: CaseDefinition): string[] {
  const issues: string[] = [];
  const push = (msg: string) => issues.push(`[${caseDef.id}] ${msg}`);

  const ids = {
    location: new Set(caseDef.locations.map((l) => l.id)),
    suspect: new Set(caseDef.suspects.map((s) => s.id)),
    evidence: new Set(caseDef.evidence.map((e) => e.id)),
    action: new Set(caseDef.actions.map((a) => a.id)),
    witness: new Set(caseDef.witnesses.map((w) => w.id)),
  };
  const lists = {
    location: caseDef.locations,
    suspect: caseDef.suspects,
    evidence: caseDef.evidence,
    action: caseDef.actions,
    witness: caseDef.witnesses,
  };
  for (const [kind, list] of Object.entries(lists)) {
    if (ids[kind as keyof typeof ids].size !== list.length) push(`ids duplicados em ${kind}`);
  }

  const checkCondition = (condition: Condition | undefined, where: string) => {
    if (!condition) return;
    for (const id of [...(condition.evidence ?? []), ...(condition.anyEvidence ?? [])]) {
      if (!ids.evidence.has(id)) push(`${where}: evidência inexistente ${id}`);
    }
    for (const id of condition.actions ?? []) if (!ids.action.has(id)) push(`${where}: ação inexistente ${id}`);
    for (const id of condition.visited ?? []) if (!ids.location.has(id)) push(`${where}: local inexistente ${id}`);
  };

  // Requisitos mínimos de conteúdo
  if (caseDef.locations.length < 3) push("menos de 3 localidades");
  if (caseDef.suspects.length < 3) push("menos de 3 suspeitos");
  if (caseDef.hints.length < 3) push("menos de 3 dicas");
  if (caseDef.traits.length < 2) push("menos de 2 características de perfil");

  // Locais e rotas
  if (!ids.location.has(caseDef.startingLocationId)) push("local inicial inexistente");
  const start = caseDef.locations.find((l) => l.id === caseDef.startingLocationId);
  if (start?.hiddenUntil) push("local inicial não pode estar oculto");
  const routeKeys = new Set<string>();
  for (const [a, b, minutes] of caseDef.routes) {
    if (!ids.location.has(a) || !ids.location.has(b)) push(`rota com local inexistente ${a}-${b}`);
    if (a === b) push(`rota para o próprio local ${a}`);
    if (!(minutes > 0)) push(`rota ${a}-${b} sem custo positivo`);
    const key = [a, b].sort().join("|");
    if (routeKeys.has(key)) push(`rota duplicada ${key}`);
    routeKeys.add(key);
  }
  for (const location of caseDef.locations) {
    checkCondition(location.hiddenUntil, `local ${location.id}`);
    const { x, y } = location.position;
    if (x < 0 || x > 100 || y < 0 || y > 100) push(`local ${location.id} fora do mapa`);
  }

  // Testemunhas e ações
  for (const witness of caseDef.witnesses) {
    if (!ids.location.has(witness.locationId)) push(`testemunha ${witness.id} em local inexistente`);
    if (!caseDef.actions.some((a) => a.witnessId === witness.id)) push(`testemunha ${witness.id} sem diálogo`);
  }
  for (const action of caseDef.actions) {
    if (!ids.location.has(action.locationId)) push(`ação ${action.id} em local inexistente`);
    if (action.witnessId && !ids.witness.has(action.witnessId)) push(`ação ${action.id} com testemunha inexistente`);
    if (action.kind === "entrevistar" && (!action.witnessId || !action.dialogue?.length)) {
      push(`entrevista ${action.id} sem testemunha ou diálogo`);
    }
    if (action.timeCost < 0) push(`ação ${action.id} com custo negativo`);
    checkCondition(action.requires, `ação ${action.id}`);
    for (const id of action.yields?.evidenceIds ?? []) {
      if (!ids.evidence.has(id)) push(`ação ${action.id} gera evidência inexistente ${id}`);
    }
    for (const id of action.yields?.alibiConfirmed ?? []) {
      if (!ids.suspect.has(id)) push(`ação ${action.id} confirma álibi de suspeito inexistente ${id}`);
    }
  }

  // Evidências
  for (const evidence of caseDef.evidence) {
    if (!ids.location.has(evidence.locationId)) push(`evidência ${evidence.id} em local inexistente`);
    for (const id of evidence.relatedSuspectIds ?? []) {
      if (!ids.suspect.has(id)) push(`evidência ${evidence.id} cita suspeito inexistente ${id}`);
    }
    for (const id of evidence.relatedEvidenceIds ?? []) {
      if (!ids.evidence.has(id)) push(`evidência ${evidence.id} cita evidência inexistente ${id}`);
    }
    if (!caseDef.actions.some((a) => a.yields?.evidenceIds?.includes(evidence.id))) {
      push(`evidência ${evidence.id} não é gerada por nenhuma ação`);
    }
    for (const fact of evidence.reveals ?? []) {
      const trait = caseDef.traits.find((tr) => tr.key === fact.trait);
      if (!trait || !trait.options.some((o) => o.value === fact.value)) {
        push(`evidência ${evidence.id} revela característica inválida ${fact.trait}=${fact.value}`);
      }
    }
  }

  // Suspeitos e características
  for (const suspect of caseDef.suspects) {
    checkCondition(suspect.hiddenUntil, `suspeito ${suspect.id}`);
    for (const trait of caseDef.traits) {
      const value = suspect.traits[trait.key];
      if (!value || !trait.options.some((o) => o.value === value)) {
        push(`suspeito ${suspect.id} sem valor válido para ${trait.key}`);
      }
    }
    for (const [key, condition] of Object.entries(suspect.hiddenTraits ?? {})) {
      if (!caseDef.traits.some((tr) => tr.key === key)) push(`suspeito ${suspect.id} oculta característica inexistente ${key}`);
      checkCondition(condition, `suspeito ${suspect.id}.${key}`);
    }
  }

  // Solução
  const { solution } = caseDef;
  const culprit = caseDef.suspects.find((s) => s.id === solution.culpritId);
  if (!culprit) {
    push("responsável inexistente");
    return issues;
  }
  if (!ids.location.has(solution.captureLocationId)) push("local de captura inexistente");
  for (const id of [...solution.requiredEvidenceIds, ...solution.supportingEvidenceIds]) {
    if (!ids.evidence.has(id)) push(`solução cita evidência inexistente ${id}`);
    if (caseDef.evidence.find((e) => e.id === id)?.relevance === "enganosa") {
      push(`solução se apoia em evidência enganosa ${id}`);
    }
  }
  if (solution.requiredTraits.length === 0) push("solução sem características obrigatórias");
  for (const key of solution.requiredTraits) {
    if (!caseDef.traits.some((tr) => tr.key === key)) push(`característica obrigatória inexistente ${key}`);
    const value = culprit.traits[key];
    const revealed = caseDef.evidence.some(
      (e) => e.relevance !== "enganosa" && e.reveals?.some((f) => f.trait === key && f.value === value),
    );
    if (!revealed) push(`nenhuma evidência confiável revela ${key}=${value} do responsável`);
  }
  if (caseDef.actions.some((a) => a.yields?.alibiConfirmed?.includes(culprit.id))) {
    push("uma ação confirma o álibi do responsável");
  }
  for (const other of caseDef.suspects) {
    if (other.id === culprit.id) continue;
    const differs = solution.requiredTraits.some((key) => other.traits[key] !== culprit.traits[key]);
    if (!differs) push(`suspeito ${other.id} é indistinguível do responsável pelo perfil`);
  }
  if (caseDef.completionRules.minEvidenceForWarrant > caseDef.evidence.length) {
    push("mínimo de evidências para mandado maior que o total disponível");
  }

  // Alcançabilidade: explorando tudo, sem limite de tempo, todas as evidências e o local
  // de captura precisam ficar acessíveis.
  const explored = exploreAll(caseDef);
  for (const evidence of caseDef.evidence) {
    if (!explored.discoveredEvidenceIds.includes(evidence.id)) push(`evidência ${evidence.id} inalcançável`);
  }
  for (const location of caseDef.locations) {
    if (!explored.visitedLocationIds.includes(location.id)) push(`local ${location.id} inalcançável`);
  }

  return issues;
}

/** Explora o caso exaustivamente (ignora o tempo) e retorna o que foi alcançado. */
export function exploreAll(caseDef: CaseDefinition) {
  const progress = {
    discoveredEvidenceIds: [] as string[],
    completedActionIds: [] as string[],
    visitedLocationIds: [caseDef.startingLocationId],
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of caseDef.routes) {
      for (const [from, to] of [
        [a, b],
        [b, a],
      ] as const) {
        const target = caseDef.locations.find((l) => l.id === to);
        if (
          progress.visitedLocationIds.includes(from) &&
          !progress.visitedLocationIds.includes(to) &&
          target &&
          isConditionMet(target.hiddenUntil, progress)
        ) {
          progress.visitedLocationIds.push(to);
          changed = true;
        }
      }
    }
    for (const action of caseDef.actions) {
      if (
        !progress.completedActionIds.includes(action.id) &&
        progress.visitedLocationIds.includes(action.locationId) &&
        isConditionMet(action.requires, progress)
      ) {
        progress.completedActionIds.push(action.id);
        for (const id of action.yields?.evidenceIds ?? []) {
          if (!progress.discoveredEvidenceIds.includes(id)) progress.discoveredEvidenceIds.push(id);
        }
        changed = true;
      }
    }
  }
  return progress;
}
