import type { Evidence } from "./evidence";
import type { Suspect } from "./suspect";

export type Difficulty = "facil" | "intermediario" | "avancado";

export type CaseCategory =
  | "patrimonio_historico"
  | "fraude_documental"
  | "espionagem_tecnologica"
  | "obra_de_arte"
  | "depoimentos_contraditorios";

/**
 * Condição de desbloqueio. Todas as listas informadas precisam ser satisfeitas
 * (exceto `anyEvidence`, que exige pelo menos uma).
 */
export interface Condition {
  evidence?: string[];
  anyEvidence?: string[];
  actions?: string[];
  visited?: string[];
}

export type LocationType =
  | "museu"
  | "escritorio"
  | "aeroporto"
  | "porto"
  | "estacao"
  | "residencia"
  | "laboratorio"
  | "hotel"
  | "comercio"
  | "galeria"
  | "cartorio"
  | "banco"
  | "oficina"
  | "armazem"
  | "centro_eventos"
  | "hospital";

export interface Location {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  type: LocationType;
  /** Posição no mapa estilizado do caso, de 0 a 100 em cada eixo. */
  position: { x: number; y: number };
  /** Local só aparece no mapa quando a condição é satisfeita. */
  hiddenUntil?: Condition;
}

/** Ligação bidirecional entre dois locais, com custo de deslocamento em minutos. */
export type Route = [from: string, to: string, minutes: number];

export type ActionKind =
  | "examinar"
  | "entrevistar"
  | "consultar_registro"
  | "analisar"
  | "verificar_alibi"
  | "cruzar_informacoes";

export interface DialogueLine {
  speaker: "agente" | "testemunha";
  text: string;
}

export interface InvestigativeAction {
  id: string;
  locationId: string;
  kind: ActionKind;
  label: string;
  /** Texto curto exibido antes de executar a ação. */
  description: string;
  timeCost: number;
  witnessId?: string;
  /** A ação só aparece quando a condição é satisfeita. */
  requires?: Condition;
  dialogue?: DialogueLine[];
  /** Narrativa exibida depois de executar a ação. */
  resultText: string;
  yields?: {
    evidenceIds?: string[];
    /** Suspeitos cujo álibi fica confirmado por esta ação. */
    alibiConfirmed?: string[];
  };
  /** Ação que não acrescenta nada à investigação (conta como desnecessária). */
  distraction?: boolean;
}

export interface Witness {
  id: string;
  name: string;
  role: string;
  description: string;
  locationId: string;
}

export interface TraitOption {
  value: string;
  label: string;
}

/** Característica usada no perfil do autor e nas fichas dos suspeitos. */
export interface DeductionTrait {
  key: string;
  label: string;
  question: string;
  options: TraitOption[];
}

export interface CaseSolution {
  culpritId: string;
  /** Evidências que precisam ter sido descobertas para o mandado ser concedido. */
  requiredEvidenceIds: string[];
  /** Evidências que sustentam a acusação (usadas na qualidade da dedução). */
  supportingEvidenceIds: string[];
  /** Características do perfil que precisam estar corretas no pedido de mandado. */
  requiredTraits: string[];
  captureLocationId: string;
  explanation: string;
}

export interface CompletionRules {
  /** Evidências descobertas necessárias para poder protocolar um pedido de mandado. */
  minEvidenceForWarrant: number;
  minCitedEvidence: number;
  maxWarrantAttempts: number;
  warrantTimeCost: number;
  wrongWarrantTimePenalty: number;
  captureTimeCost: number;
  wrongCaptureTimePenalty: number;
  maxCaptureAttempts: number;
}

export interface ScoringRules {
  identification: number;
  capture: number;
  evidenceMax: number;
  deductionMax: number;
  timeMax: number;
  secondaryObjective: number;
  wrongWarrantPenalty: number;
  wrongCapturePenalty: number;
  unnecessaryActionPenalty: number;
}

export interface SecondaryObjective {
  id: string;
  description: string;
  condition?: Condition;
  /** Concluir o caso com pelo menos este tempo restante (minutos). */
  minRemainingTime?: number;
}

export interface Hint {
  text: string;
  penalty: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  text: string;
}

export interface CaseEndings {
  success: string;
  partial: string;
  failure: string;
}

export interface CaseDefinition {
  id: string;
  slug: string;
  order: number;
  title: string;
  synopsis: string;
  category: CaseCategory;
  difficulty: Difficulty;
  origin: string;
  rewardPoints: number;
  /** Casos que precisam ser solucionados antes deste ficar disponível. */
  unlockAfter: string[];
  briefing: { from: string; paragraphs: string[] };
  objective: string;
  secondaryObjectives: SecondaryObjective[];
  /** Hora do dia em que a investigação começa, em minutos desde 00:00. */
  clockStart: number;
  timeBudget: number;
  startingLocationId: string;
  mapLabel: string;
  locations: Location[];
  routes: Route[];
  witnesses: Witness[];
  suspects: Suspect[];
  evidence: Evidence[];
  actions: InvestigativeAction[];
  traits: DeductionTrait[];
  solution: CaseSolution;
  completionRules: CompletionRules;
  scoringRules?: Partial<ScoringRules>;
  endings: CaseEndings;
  hints: Hint[];
  tutorial?: TutorialStep[];
}
