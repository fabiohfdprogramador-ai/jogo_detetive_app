/**
 * Estados de uma investigação.
 *
 *   investigando ──(mandado concedido)──▶ mandado_autorizado ──(captura)──▶ concluido
 *        │                                        │
 *        └──(tempo esgotado / tentativas)──▶ fracasso   └──(tempo / fuga)──▶ parcial
 */
export type SessionStatus =
  | "investigando"
  | "mandado_autorizado"
  | "concluido"
  | "parcial"
  | "fracasso";

/** Estado de um caso na campanha (derivado do progresso salvo). */
export type CaseAvailability = "bloqueado" | "disponivel" | "em_andamento" | "concluido";

export type LogEntryType =
  | "inicio"
  | "acao"
  | "viagem"
  | "mandado"
  | "captura"
  | "dica"
  | "anotacao"
  | "encerramento";

export interface ActionLogEntry {
  id: string;
  type: LogEntryType;
  label: string;
  detail?: string;
  /** Minutos decorridos desde o início do caso quando o registro foi feito. */
  at: number;
  timeCost: number;
  locationId: string;
  outcome?: "sucesso" | "falha" | "neutro";
}

export interface WarrantRequest {
  suspectId: string;
  traitAnswers: Record<string, string>;
  citedEvidenceIds: string[];
}

export interface WarrantState {
  status: "nao_solicitado" | "negado" | "autorizado";
  attempts: number;
  lastRequest: WarrantRequest | null;
}

export interface GameSession {
  id: string;
  caseId: string;
  status: SessionStatus;
  currentLocationId: string;
  remainingTime: number;
  discoveredEvidenceIds: string[];
  /** Minutos decorridos no momento em que cada evidência foi coletada. */
  evidenceFoundAt: Record<string, number>;
  completedActionIds: string[];
  visitedLocationIds: string[];
  interviewedWitnessIds: string[];
  confirmedAlibiIds: string[];
  eliminatedSuspectIds: string[];
  /** Evidências marcadas pelo jogador como relevantes. */
  flaggedEvidenceIds: string[];
  /** Relações criadas pelo jogador entre duas evidências. */
  evidenceLinks: [string, string][];
  /** Perfil do autor em construção pelo jogador. */
  profile: Record<string, string>;
  selectedSuspectId: string | null;
  warrant: WarrantState;
  captureAttempts: number;
  unnecessaryActions: number;
  hintsUsed: number;
  actionHistory: ActionLogEntry[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface ScoreLine {
  label: string;
  points: number;
  detail?: string;
}

export type PerformanceRating =
  | "inconclusivo"
  | "em_formacao"
  | "agente_de_campo"
  | "elite";

export interface ScoreResult {
  lines: ScoreLine[];
  total: number;
  max: number;
  rating: PerformanceRating;
}

export interface CaseRecord {
  attempts: number;
  successes: number;
  partials: number;
  failures: number;
  bestScore: number;
  bestRating: PerformanceRating | null;
  /** Soma dos minutos usados em investigações finalizadas. */
  totalTimeUsed: number;
  finishedRuns: number;
  hintsUsed: number;
  lastPlayedAt: string | null;
}

export interface GameSettings {
  tutorialEnabled: boolean;
  hintsEnabled: boolean;
  confirmTravel: boolean;
  textSize: "normal" | "grande";
  reducedMotion: "sistema" | "reduzir";
}

export interface SaveData {
  version: number;
  createdAt: string;
  updatedAt: string;
  settings: GameSettings;
  tutorialCompleted: boolean;
  /** Sessão mais recente de cada caso (em andamento ou finalizada). */
  sessions: Record<string, GameSession>;
  records: Record<string, CaseRecord>;
  lastCaseId: string | null;
}
