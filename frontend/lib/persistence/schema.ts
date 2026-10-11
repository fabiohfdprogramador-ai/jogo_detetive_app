import { z } from "zod";

export const SAVE_VERSION = 2;

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
  soundEnabled: z.boolean(),
  musicEnabled: z.boolean(),
  volume: z.number().min(0).max(100),
});

const traitKey = z.enum(["sexo", "cabelo", "hobby", "marca", "veiculo"]);
const chaseStatus = z.enum(["ativo", "capturado", "fugiu", "prisao_errada", "tempo_esgotado"]);

const chaseSpotSchema = z.object({
  id: z.string(),
  place: z.enum(["banco", "aeroporto", "biblioteca", "museu", "mercado", "hotel", "porto", "cafe"]),
  witness: z.object({ role: z.string(), emoji: z.string() }),
  lines: z.array(z.string()),
  traitClue: z.object({ trait: traitKey, value: z.string() }).optional(),
  hideout: z.boolean().optional(),
});

export const chaseSessionSchema = z.object({
  id: z.string(),
  case: z.object({
    id: z.string(),
    seed: z.number(),
    rankIndex: z.number().int().min(0),
    item: z.object({ name: z.string(), emoji: z.string() }),
    route: z.array(z.string()).min(2),
    culpritId: z.string(),
    revealedTraits: z.array(traitKey),
    stops: z.record(
      z.object({
        cityId: z.string(),
        kind: z.enum(["rota", "despiste", "final"]),
        spots: z.array(chaseSpotSchema),
        connections: z.array(z.string()),
      }),
    ),
    startHour: z.number(),
    deadlineHour: z.number(),
  }),
  status: chaseStatus,
  currentCityId: z.string(),
  hour: z.number(),
  path: z.array(z.string()),
  visitedSpots: z.record(z.array(z.string())),
  notes: z.array(
    z.object({ cityId: z.string(), spotId: z.string(), text: z.string(), kind: z.enum(["destino", "suspeito", "aviso", "nada"]) }),
  ),
  traitFilter: z.record(z.string()),
  warrantSuspectId: z.string().nullable(),
  log: z.array(z.object({ hour: z.number(), text: z.string(), emoji: z.string() })),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

const chaseRecordSchema = z.object({
  solved: z.number().int().min(0),
  failed: z.number().int().min(0),
  bestScore: z.number().min(0),
  totalScore: z.number().min(0),
  history: z.array(
    z.object({ id: z.string(), status: chaseStatus, score: z.number(), itemName: z.string(), finishedAt: z.string() }),
  ),
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
  chase: z.object({ active: chaseSessionSchema.nullable(), record: chaseRecordSchema }),
});
