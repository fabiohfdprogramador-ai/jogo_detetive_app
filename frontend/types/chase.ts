/** Tipos do Modo Perseguição (caça ao suspeito de cidade em cidade). */

export type ClueCategory = "moeda" | "idioma" | "bandeira" | "turismo" | "comida" | "geografia";

export interface WorldCity {
  id: string;
  name: string;
  country: string;
  /** Código ISO 3166-1 alfa-2, usado para a bandeira. */
  countryCode: string;
  lat: number;
  lon: number;
  emoji: string;
  description: string;
  /** Nome da moeda no plural, ex.: "pesos argentinos". */
  currency: string;
  /** Idioma principal, ex.: "espanhol". */
  language: string;
  flag: string;
  turismo: string[];
  comida: string[];
  geografia: string[];
  /** Objeto roubado quando o crime acontece nesta cidade. */
  item: { name: string; emoji: string };
}

export type TraitKey = "sexo" | "cabelo" | "hobby" | "marca" | "veiculo";

export interface ChaseSuspect {
  id: string;
  name: string;
  emoji: string;
  hue: number;
  bio: string;
  traits: Record<TraitKey, string>;
}

export type PlaceType = "banco" | "aeroporto" | "biblioteca" | "museu" | "mercado" | "hotel" | "porto" | "cafe";

export interface ChaseSpot {
  id: string;
  place: PlaceType;
  witness: { role: string; emoji: string };
  /** Falas da testemunha, na ordem. */
  lines: string[];
  traitClue?: { trait: TraitKey; value: string };
  /** Na cidade final: o esconderijo onde a captura acontece. */
  hideout?: boolean;
}

export type StopKind = "rota" | "despiste" | "final";

export interface ChaseStop {
  cityId: string;
  kind: StopKind;
  spots: ChaseSpot[];
  /** Destinos de voo oferecidos a partir desta cidade. */
  connections: string[];
}

export interface ChaseCase {
  id: string;
  seed: number;
  rankIndex: number;
  item: { name: string; emoji: string };
  route: string[];
  culpritId: string;
  /** Características que as pistas revelam (além do sexo, dado no plantão). */
  revealedTraits: TraitKey[];
  stops: Record<string, ChaseStop>;
  /** Hora absoluta (desde segunda 00:00) em que a missão começa e o prazo final. */
  startHour: number;
  deadlineHour: number;
}

export type ChaseStatus = "ativo" | "capturado" | "fugiu" | "prisao_errada" | "tempo_esgotado";

export interface ChaseNote {
  cityId: string;
  spotId: string;
  text: string;
  kind: "destino" | "suspeito" | "aviso" | "nada";
}

export interface ChaseLogEntry {
  hour: number;
  text: string;
  emoji: string;
}

export interface ChaseSession {
  id: string;
  case: ChaseCase;
  status: ChaseStatus;
  currentCityId: string;
  hour: number;
  /** Cidades por onde o agente passou, em ordem (com repetições). */
  path: string[];
  visitedSpots: Record<string, string[]>;
  notes: ChaseNote[];
  traitFilter: Partial<Record<TraitKey, string>>;
  warrantSuspectId: string | null;
  log: ChaseLogEntry[];
  startedAt: string;
  finishedAt: string | null;
}

export interface ChaseRecord {
  solved: number;
  failed: number;
  bestScore: number;
  totalScore: number;
  history: { id: string; status: ChaseStatus; score: number; itemName: string; finishedAt: string }[];
}
