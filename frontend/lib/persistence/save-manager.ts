/**
 * Regras do salvamento: criação, migração, validação e atualização de estatísticas.
 * Funções puras, independentes de onde os dados ficam guardados (ver repositories.ts).
 */
import type { CaseDefinition } from "@/types/case";
import type { CaseRecord, GameSession, GameSettings, SaveData } from "@/types/game";
import type { ChaseRecord, ChaseSession } from "@/types/chase";
import { chaseScore } from "@/lib/chase/engine";
import { calculateScore } from "@/lib/game/scoring";
import { isFinished } from "@/lib/game/selectors";
import { SAVE_VERSION, saveDataSchema } from "./schema";

export type LoadResult =
  | { status: "ok"; data: SaveData; migrated: boolean }
  | { status: "empty" }
  | { status: "corrupted"; reason: string }
  | { status: "newer_version"; version: number };

export const DEFAULT_SETTINGS: GameSettings = {
  tutorialEnabled: true,
  hintsEnabled: true,
  confirmTravel: true,
  textSize: "normal",
  reducedMotion: "sistema",
  soundEnabled: true,
  musicEnabled: true,
  volume: 70,
};

export function emptyChaseRecord(): ChaseRecord {
  return { solved: 0, failed: 0, bestScore: 0, totalScore: 0, history: [] };
}

export function createEmptySave(now = new Date()): SaveData {
  const iso = now.toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: iso,
    updatedAt: iso,
    settings: { ...DEFAULT_SETTINGS },
    tutorialCompleted: false,
    sessions: {},
    records: {},
    lastCaseId: null,
    chase: { active: null, record: emptyChaseRecord() },
  };
}

export function emptyRecord(): CaseRecord {
  return {
    attempts: 0,
    successes: 0,
    partials: 0,
    failures: 0,
    bestScore: 0,
    bestRating: null,
    totalTimeUsed: 0,
    finishedRuns: 0,
    hintsUsed: 0,
    lastPlayedAt: null,
  };
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrações por versão de origem. Ao mudar o formato, incremente SAVE_VERSION e
 * adicione aqui a conversão da versão anterior.
 */
const MIGRATIONS: Record<number, Migration> = {
  // Versão 0: protótipo interno sem campo de versão nem configurações completas.
  0: (data) => ({
    ...data,
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings as object | undefined) },
    tutorialCompleted: data.tutorialCompleted ?? false,
    lastCaseId: data.lastCaseId ?? null,
  }),
  // Versão 1 → 2: configurações de som e o Modo Perseguição.
  1: (data) => ({
    ...data,
    version: 2,
    settings: { ...DEFAULT_SETTINGS, ...(data.settings as object | undefined) },
    chase: { active: null, record: emptyChaseRecord() },
  }),
};

/** Valida e migra dados brutos lidos do armazenamento. Nunca lança exceções. */
export function parseSaveData(raw: string | null): LoadResult {
  if (raw === null || raw === "") return { status: "empty" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "corrupted", reason: "JSON inválido" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { status: "corrupted", reason: "Formato inesperado" };
  }
  let data = parsed as Record<string, unknown>;
  let version = typeof data.version === "number" ? data.version : 0;
  if (version > SAVE_VERSION) return { status: "newer_version", version };
  const migrated = version < SAVE_VERSION;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { status: "corrupted", reason: `Sem migração da versão ${version}` };
    data = migrate(data);
    version = typeof data.version === "number" ? data.version : version + 1;
  }
  const result = saveDataSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    return { status: "corrupted", reason: `${issue?.path.join(".") ?? ""}: ${issue?.message ?? "inválido"}` };
  }
  return { status: "ok", data: result.data as SaveData, migrated };
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

export function touch(save: SaveData, now = new Date()): SaveData {
  return { ...save, updatedAt: now.toISOString() };
}

/** Registra uma nova sessão iniciada (conta como tentativa). */
export function registerSessionStart(save: SaveData, session: GameSession, now = new Date()): SaveData {
  const record = { ...(save.records[session.caseId] ?? emptyRecord()) };
  record.attempts += 1;
  record.lastPlayedAt = now.toISOString();
  return touch(
    {
      ...save,
      sessions: { ...save.sessions, [session.caseId]: session },
      records: { ...save.records, [session.caseId]: record },
      lastCaseId: session.caseId,
    },
    now,
  );
}

/**
 * Atualiza a sessão salva. Se a sessão acabou de ser finalizada, atualiza também as
 * estatísticas do caso (apenas uma vez por sessão).
 */
export function applySessionUpdate(
  save: SaveData,
  caseDef: CaseDefinition,
  session: GameSession,
  now = new Date(),
): SaveData {
  const previous = save.sessions[session.caseId];
  const justFinished = isFinished(session) && !(previous && previous.id === session.id && isFinished(previous));
  const records = { ...save.records };
  if (justFinished) {
    const record = { ...(records[session.caseId] ?? emptyRecord()) };
    const score = calculateScore(caseDef, session);
    if (session.status === "concluido") record.successes += 1;
    else if (session.status === "parcial") record.partials += 1;
    else record.failures += 1;
    record.finishedRuns += 1;
    record.totalTimeUsed += caseDef.timeBudget - Math.max(0, session.remainingTime);
    record.hintsUsed += session.hintsUsed;
    if (record.bestRating === null || score.total > record.bestScore) {
      record.bestScore = score.total;
      record.bestRating = score.rating;
    }
    record.lastPlayedAt = now.toISOString();
    records[session.caseId] = record;
  }
  return touch(
    {
      ...save,
      sessions: { ...save.sessions, [session.caseId]: session },
      records,
      lastCaseId: session.caseId,
    },
    now,
  );
}

/** Remove a sessão de um caso (reiniciar caso). Estatísticas são preservadas. */
export function removeSession(save: SaveData, caseId: string, now = new Date()): SaveData {
  const sessions = { ...save.sessions };
  delete sessions[caseId];
  return touch({ ...save, sessions }, now);
}

export function updateSettings(save: SaveData, settings: Partial<GameSettings>, now = new Date()): SaveData {
  return touch({ ...save, settings: { ...save.settings, ...settings } }, now);
}

export interface CampaignStats {
  casesSolved: number;
  casesCompleted: number;
  totalAttempts: number;
  finishedRuns: number;
  successRate: number;
  averageTime: number;
  hintsUsed: number;
  totalBestScore: number;
}

export function computeCampaignStats(save: SaveData): CampaignStats {
  const records = Object.values(save.records);
  const sum = (fn: (r: CaseRecord) => number) => records.reduce((acc, r) => acc + fn(r), 0);
  const finishedRuns = sum((r) => r.finishedRuns);
  return {
    casesSolved: records.filter((r) => r.successes + r.partials > 0).length,
    casesCompleted: records.filter((r) => r.successes > 0).length,
    totalAttempts: sum((r) => r.attempts),
    finishedRuns,
    successRate: finishedRuns > 0 ? sum((r) => r.successes) / finishedRuns : 0,
    averageTime: finishedRuns > 0 ? sum((r) => r.totalTimeUsed) / finishedRuns : 0,
    hintsUsed: sum((r) => r.hintsUsed),
    totalBestScore: sum((r) => r.bestScore),
  };
}

/** Guarda a missão em andamento e, ao terminar, atualiza o histórico da perseguição. */
export function applyChaseUpdate(save: SaveData, session: ChaseSession, now = new Date()): SaveData {
  const previous = save.chase.active;
  const justFinished = session.status !== "ativo" && !(previous && previous.id === session.id && previous.status !== "ativo");
  let record = save.chase.record;
  if (justFinished) {
    const score = chaseScore(session);
    record = {
      solved: record.solved + (session.status === "capturado" ? 1 : 0),
      failed: record.failed + (session.status === "capturado" ? 0 : 1),
      bestScore: Math.max(record.bestScore, score),
      totalScore: record.totalScore + score,
      history: [
        { id: session.id, status: session.status, score, itemName: session.case.item.name, finishedAt: now.toISOString() },
        ...record.history,
      ].slice(0, 20),
    };
  }
  return touch({ ...save, chase: { active: session, record } }, now);
}

export function clearActiveChase(save: SaveData, now = new Date()): SaveData {
  return touch({ ...save, chase: { ...save.chase, active: null } }, now);
}
