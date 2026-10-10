import { describe, expect, it, vi } from "vitest";
import { getCaseById } from "@/lib/game/case-loader";
import { performAction, startCase } from "@/lib/game/engine";
import {
  applySessionUpdate,
  computeCampaignStats,
  createEmptySave,
  parseSaveData,
  registerSessionStart,
  removeSession,
  serializeSave,
} from "@/lib/persistence/save-manager";
import {
  ApiSaveRepository,
  BACKUP_KEY_PREFIX,
  KeyValueSaveRepository,
  MemoryStorage,
  SAVE_KEY,
} from "@/lib/persistence/storage";
import { getCaseAvailability } from "@/lib/game/case-loader";
import { WALKTHROUGHS, runSteps } from "../fixtures/walkthroughs";

const caso = getCaseById("astrolabio-do-solar")!;
const caso2 = getCaseById("selos-que-nao-existem")!;

describe("salvamento e recuperação", () => {
  it("salva e recupera uma partida em andamento", async () => {
    const storage = new MemoryStorage();
    const repo = new KeyValueSaveRepository(storage, "memory");
    let session = startCase(caso);
    const r = performAction(caso, session, "c1-a-vitrine");
    if (!r.ok) throw new Error(r.error);
    session = r.session;
    const save = applySessionUpdate(registerSessionStart(createEmptySave(), startCase(caso)), caso, session);
    await repo.save(save);

    const loaded = await new KeyValueSaveRepository(storage, "memory").load();
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.data.sessions[caso.id]?.discoveredEvidenceIds).toEqual(["c1-e-vitrine"]);
    expect(loaded.data.lastCaseId).toBe(caso.id);
    expect(getCaseAvailability(loaded.data, caso)).toBe("em_andamento");
  });

  it("retorna vazio quando não há progresso", async () => {
    const repo = new KeyValueSaveRepository(new MemoryStorage(), "memory");
    expect((await repo.load()).status).toBe("empty");
  });

  it("detecta dados corrompidos sem apagar e guarda uma cópia de segurança", async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "{isto não é json");
    const repo = new KeyValueSaveRepository(storage, "memory");
    const result = await repo.load();
    expect(result.status).toBe("corrupted");
    await repo.backupCorrupted();
    expect(storage.getItem(SAVE_KEY)).toBe("{isto não é json");
    expect(storage.keys().some((k) => k.startsWith(BACKUP_KEY_PREFIX))).toBe(true);
  });

  it("rejeita estrutura inválida e versões mais novas", () => {
    expect(parseSaveData(JSON.stringify({ version: 1, sessions: 5 })).status).toBe("corrupted");
    expect(parseSaveData("[]").status).toBe("corrupted");
    const future = parseSaveData(JSON.stringify({ ...createEmptySave(), version: 99 }));
    expect(future).toEqual({ status: "newer_version", version: 99 });
  });

  it("migra dados da versão 0", () => {
    const old = { ...createEmptySave() } as Record<string, unknown>;
    delete old.version;
    old.settings = { hintsEnabled: false };
    const result = parseSaveData(JSON.stringify(old));
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.migrated).toBe(true);
    expect(result.data.version).toBe(1);
    expect(result.data.settings.hintsEnabled).toBe(false);
    expect(result.data.settings.tutorialEnabled).toBe(true);
  });

  it("atualiza estatísticas uma única vez ao concluir e libera o próximo caso", () => {
    let save = registerSessionStart(createEmptySave(), startCase(caso));
    expect(getCaseAvailability(save, caso2)).toBe("bloqueado");
    const finished = runSteps(caso, WALKTHROUGHS[caso.id]!);
    save = applySessionUpdate(save, caso, finished);
    save = applySessionUpdate(save, caso, finished); // salvar de novo não duplica
    const record = save.records[caso.id]!;
    expect(record.successes).toBe(1);
    expect(record.finishedRuns).toBe(1);
    expect(record.bestScore).toBeGreaterThan(0);
    expect(getCaseAvailability(save, caso)).toBe("concluido");
    expect(getCaseAvailability(save, caso2)).toBe("disponivel");

    const stats = computeCampaignStats(save);
    expect(stats.casesCompleted).toBe(1);
    expect(stats.successRate).toBe(1);

    save = removeSession(save, caso.id);
    expect(save.sessions[caso.id]).toBeUndefined();
    expect(save.records[caso.id]?.successes).toBe(1);
  });

  it("serializa e valida o próprio formato (ida e volta)", () => {
    const save = applySessionUpdate(createEmptySave(), caso, runSteps(caso, WALKTHROUGHS[caso.id]!));
    const parsed = parseSaveData(serializeSave(save));
    expect(parsed.status).toBe("ok");
  });

  it("repositório da API usa GET/PUT e trata 404 como vazio", async () => {
    const save = createEmptySave();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: save }), { status: 200 }));
    const repo = new ApiSaveRepository("http://api.test", "jogador-1", fetchMock as unknown as typeof fetch);
    expect((await repo.load()).status).toBe("empty");
    await repo.save(save);
    expect(fetchMock.mock.calls[1]![1].method).toBe("PUT");
    expect((await repo.load()).status).toBe("ok");
    expect(fetchMock.mock.calls[0]![0]).toBe("http://api.test/api/saves/jogador-1");
  });
});
