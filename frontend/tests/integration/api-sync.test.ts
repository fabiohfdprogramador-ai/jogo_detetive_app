import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { createApp } from "../../../backend/src/app";
import { MemorySaveStore } from "../../../backend/src/store";
import { ApiSaveRepository } from "@/lib/persistence/storage";
import { applySessionUpdate, createEmptySave, registerSessionStart } from "@/lib/persistence/save-manager";
import { getCaseById } from "@/lib/game/case-loader";
import { startCase } from "@/lib/game/engine";
import { WALKTHROUGHS, runSteps } from "../fixtures/walkthroughs";

const server = createApp({ store: new MemorySaveStore() });
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("integração frontend ↔ backend", () => {
  it("salva uma campanha concluída no servidor e recupera em outro dispositivo", async () => {
    const caso = getCaseById("astrolabio-do-solar")!;
    let save = registerSessionStart(createEmptySave(), startCase(caso));
    save = applySessionUpdate(save, caso, runSteps(caso, WALKTHROUGHS[caso.id]!));

    const deviceA = new ApiSaveRepository(base, "jogador-integracao-1");
    expect((await deviceA.load()).status).toBe("empty");
    await deviceA.save(save);

    const deviceB = new ApiSaveRepository(base, "jogador-integracao-1");
    const loaded = await deviceB.load();
    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.data.records[caso.id]?.successes).toBe(1);
    expect(loaded.data.sessions[caso.id]?.status).toBe("concluido");
  });

  it("informa servidor indisponível sem lançar exceção", async () => {
    const offline = new ApiSaveRepository("http://127.0.0.1:1", "jogador-integracao-2");
    expect((await offline.load()).status).toBe("corrupted");
  });
});
