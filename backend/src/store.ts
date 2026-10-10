import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Onde os saves ficam guardados. Trocar por um banco de dados = nova implementação. */
export interface SaveStore {
  get(playerId: string): Promise<unknown | null>;
  put(playerId: string, data: unknown): Promise<void>;
  delete(playerId: string): Promise<void>;
}

export class MemorySaveStore implements SaveStore {
  private data = new Map<string, unknown>();
  async get(playerId: string) {
    return this.data.has(playerId) ? structuredClone(this.data.get(playerId)) : null;
  }
  async put(playerId: string, data: unknown) {
    this.data.set(playerId, structuredClone(data));
  }
  async delete(playerId: string) {
    this.data.delete(playerId);
  }
}

/**
 * Um arquivo JSON por jogador. A gravação é atômica (arquivo temporário + rename) e a
 * versão anterior é mantida como .bak para recuperação manual.
 */
export class FileSaveStore implements SaveStore {
  constructor(private dir: string) {}

  private file(playerId: string) {
    return path.join(this.dir, `${playerId}.json`);
  }

  async get(playerId: string) {
    try {
      return JSON.parse(await readFile(this.file(playerId), "utf8")) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async put(playerId: string, data: unknown) {
    await mkdir(this.dir, { recursive: true });
    const target = this.file(playerId);
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data), "utf8");
    await rename(target, `${target}.bak`).catch(() => undefined);
    await rename(tmp, target);
  }

  async delete(playerId: string) {
    await rm(this.file(playerId), { force: true });
  }
}
