/**
 * Onde o progresso fica guardado. A interface SaveRepository isola o resto do jogo
 * do mecanismo concreto: hoje localStorage (padrão) ou a API do backend; amanhã,
 * qualquer banco de dados, sem alterar o motor nem a interface.
 */
import type { SaveData } from "@/types/game";
import { parseSaveData, serializeSave, type LoadResult } from "./save-manager";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveRepository {
  readonly kind: "local" | "api" | "memory";
  load(): Promise<LoadResult>;
  save(data: SaveData): Promise<void>;
  /** Guarda uma cópia dos dados ilegíveis antes de qualquer reinício. */
  backupCorrupted(): Promise<void>;
  clear(): Promise<void>;
}

export const SAVE_KEY = "rastro:save";
export const BACKUP_KEY_PREFIX = "rastro:save:backup:";

export class MemoryStorage implements KeyValueStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  keys() {
    return [...this.data.keys()];
  }
}

export class SaveError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SaveError";
  }
}

/** Repositório baseado em armazenamento chave-valor (localStorage no navegador). */
export class KeyValueSaveRepository implements SaveRepository {
  readonly kind: "local" | "memory";
  constructor(
    private storage: KeyValueStorage,
    kind: "local" | "memory" = "local",
  ) {
    this.kind = kind;
  }

  async load(): Promise<LoadResult> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
    } catch (error) {
      return { status: "corrupted", reason: `Armazenamento indisponível: ${(error as Error).message}` };
    }
    return parseSaveData(raw);
  }

  async save(data: SaveData): Promise<void> {
    try {
      this.storage.setItem(SAVE_KEY, serializeSave(data));
    } catch (error) {
      throw new SaveError("Não foi possível gravar o progresso", { cause: error });
    }
  }

  async backupCorrupted(): Promise<void> {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (raw !== null) this.storage.setItem(`${BACKUP_KEY_PREFIX}${Date.now()}`, raw);
    } catch {
      // Sem espaço para a cópia: o dado original permanece intocado.
    }
  }

  async clear(): Promise<void> {
    this.storage.removeItem(SAVE_KEY);
  }
}

/** Repositório que sincroniza com o backend opcional (../backend). */
export class ApiSaveRepository implements SaveRepository {
  readonly kind = "api" as const;
  constructor(
    private baseUrl: string,
    private playerId: string,
    private fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  private url() {
    return `${this.baseUrl.replace(/\/$/, "")}/api/saves/${encodeURIComponent(this.playerId)}`;
  }

  async load(): Promise<LoadResult> {
    try {
      const response = await this.fetchImpl(this.url());
      if (response.status === 404) return { status: "empty" };
      if (!response.ok) return { status: "corrupted", reason: `Servidor respondeu ${response.status}` };
      const body = (await response.json()) as { data?: unknown };
      return parseSaveData(JSON.stringify(body.data ?? null));
    } catch (error) {
      return { status: "corrupted", reason: `Servidor indisponível: ${(error as Error).message}` };
    }
  }

  async save(data: SaveData): Promise<void> {
    const response = await this.fetchImpl(this.url(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    }).catch((error: unknown) => {
      throw new SaveError("Servidor indisponível", { cause: error });
    });
    if (!response.ok) throw new SaveError(`Servidor respondeu ${response.status}`);
  }

  async backupCorrupted(): Promise<void> {
    // O backend mantém o histórico de versões no próprio servidor.
  }

  async clear(): Promise<void> {
    await this.fetchImpl(this.url(), { method: "DELETE" });
  }
}

const PLAYER_ID_KEY = "rastro:player-id";

/** Escolhe o repositório conforme as variáveis de ambiente (ver .env.example). */
export function createBrowserRepository(): SaveRepository {
  const storage: KeyValueStorage =
    typeof window !== "undefined" && window.localStorage ? window.localStorage : new MemoryStorage();
  const backend = process.env.NEXT_PUBLIC_SAVE_BACKEND;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (backend === "api" && apiUrl) {
    let playerId = storage.getItem(PLAYER_ID_KEY);
    if (!playerId) {
      playerId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
      storage.setItem(PLAYER_ID_KEY, playerId);
    }
    return new ApiSaveRepository(apiUrl, playerId);
  }
  return new KeyValueSaveRepository(storage, "local");
}
