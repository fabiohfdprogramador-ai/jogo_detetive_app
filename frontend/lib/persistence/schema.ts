import { z } from "zod";

export const SAVE_VERSION = 1;

const sessionStatus = z.enum(["investigando", "mandado_autorizado", "concluido", "parcial", "fracasso"]);
const rating = z.enum(["inconclusivo", "em_formacao", "agente_de_campo", "elite"]);

const warrantRequestSchema = z.object({
  suspectId: z.string(),
  traitAnswers: z.record(z.string()),
  citedEvidenceIds: z.array(z.string()),
});

export const gameSessionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  status: sessionStatus,
  currentLocationId: z.string(),
  remainingTime: z.number(),
  discoveredEvidenceIds: z.array(z.string()),
  evidenceFoundAt: z.record(z.number()),
  completedActionIds: z.array(z.string()),
  visitedLocationIds: z.array(z.string()),
  interviewedWitnessIds: z.array(z.string()),
  confirmedAlibiIds: z.array(z.string()),
  eliminatedSuspectIds: z.array(z.string()),
  flaggedEvidenceIds: z.array(z.string()),
  evidenceLinks: z.array(z.tuple([z.string(), z.string()])),
  profile: z.record(z.string()),
  selectedSuspectId: z.string().nullable(),
  warrant: z.object({
    status: z.enum(["nao_solicitado", "negado", "autorizado"]),
    attempts: z.number().int().min(0),
    lastRequest: warrantRequestSchema.nullable(),
  }),
  captureAttempts: z.number().int().min(0),
  unnecessaryActions: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  actionHistory: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["inicio", "acao", "viagem", "mandado", "captura", "dica", "anotacao", "encerramento"]),
      label: z.string(),
      detail: z.string().optional(),
      at: z.number(),
      timeCost: z.number(),
      locationId: z.string(),
      outcome: z.enum(["sucesso", "falha", "neutro"]).optional(),
    }),
  ),
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const caseRecordSchema = z.object({
  attempts: z.number().int().min(0),
  successes: z.number().int().min(0),
  partials: z.number().int().min(0),
  failures: z.number().int().min(0),
  bestScore: z.number().min(0),
  bestRating: rating.nullable(),
  totalTimeUsed: z.number().min(0),
  finishedRuns: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  lastPlayedAt: z.string().nullable(),
});

export const settingsSchema = z.object({
  tutorialEnabled: z.boolean(),
  hintsEnabled: z.boolean(),
  confirmTravel: z.boolean(),
  textSize: z.enum(["normal", "grande"]),
  reducedMotion: z.enum(["sistema", "reduzir"]),
});

export const saveDataSchema = z.object({
  version: z.literal(SAVE_VERSION),
  createdAt: z.string(),
  updatedAt: z.string(),
  settings: settingsSchema,
  tutorialCompleted: z.boolean(),
  sessions: z.record(gameSessionSchema),
  records: z.record(caseRecordSchema),
  lastCaseId: z.string().nullable(),
});
