import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { FileSaveStore, MemorySaveStore } from "../src/store.js";

const server = createApp({ store: new MemorySaveStore(), corsOrigin: "http://localhost:3000" });
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const save = { version: 1, updatedAt: "2026-10-10T00:00:00.000Z", sessions: {}, records: {}, settings: {} };
const player = "jogador-teste-123";

describe("API de saves", () => {
  it("responde ao health check com CORS", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("retorna 404 sem progresso, salva, lê e apaga", async () => {
    expect((await fetch(`${base}/api/saves/${player}`)).status).toBe(404);
    const put = await fetch(`${base}/api/saves/${player}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: save }),
    });
    expect(put.status).toBe(204);
    const get = await fetch(`${base}/api/saves/${player}`);
    expect(get.status).toBe(200);
    expect(await get.json()).toEqual({ data: save });
    expect((await fetch(`${base}/api/saves/${player}`, { method: "DELETE" })).status).toBe(204);
    expect((await fetch(`${base}/api/saves/${player}`)).status).toBe(404);
  });

  it("rejeita identificador, JSON e formato inválidos", async () => {
    expect((await fetch(`${base}/api/saves/x`)).status).toBe(400);
    const badJson = await fetch(`${base}/api/saves/${player}`, { method: "PUT", body: "{nope" });
    expect(badJson.status).toBe(400);
    const badShape = await fetch(`${base}/api/saves/${player}`, {
      method: "PUT",
      body: JSON.stringify({ data: { version: "1" } }),
    });
    expect(badShape.status).toBe(422);
  });

  it("rejeita corpo grande demais e rotas desconhecidas", async () => {
    const huge = await fetch(`${base}/api/saves/${player}`, {
      method: "PUT",
      body: JSON.stringify({ data: { ...save, padding: "x".repeat(1_100_000) } }),
    });
    expect(huge.status).toBe(413);
    expect((await fetch(`${base}/api/nada`)).status).toBe(404);
    expect((await fetch(`${base}/api/saves/${player}`, { method: "POST" })).status).toBe(405);
  });
});

describe("FileSaveStore", () => {
  it("grava em disco e mantém a versão anterior como .bak", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "rastro-saves-"));
    try {
      const store = new FileSaveStore(dir);
      expect(await store.get(player)).toBeNull();
      await store.put(player, { v: 1 });
      await store.put(player, { v: 2 });
      expect(await store.get(player)).toEqual({ v: 2 });
      expect(JSON.parse(await readFile(path.join(dir, `${player}.json.bak`), "utf8"))).toEqual({ v: 1 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
