/**
 * API mínima do Rastro, sem framework (apenas node:http + zod).
 *
 *   GET    /api/health              → { status: "ok" }
 *   GET    /api/saves/:playerId     → { data } | 404
 *   PUT    /api/saves/:playerId     ← { data }  → 204
 *   DELETE /api/saves/:playerId     → 204
 *
 * O playerId é um identificador anônimo gerado no navegador; nenhum dado pessoal é
 * recebido. A validação completa do formato do save acontece no frontend; aqui
 * verificamos apenas estrutura mínima e tamanho. Uma versão competitiva precisará
 * validar as partidas no servidor com o mesmo motor de regras.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import type { SaveStore } from "./store.js";

export const MAX_BODY_BYTES = 1_000_000;

const playerIdSchema = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

const saveBodySchema = z.object({
  data: z
    .object({
      version: z.number().int().positive(),
      updatedAt: z.string(),
      sessions: z.record(z.unknown()),
      records: z.record(z.unknown()),
    })
    .passthrough(),
});

export interface AppOptions {
  store: SaveStore;
  corsOrigin?: string;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body?: unknown) {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }).end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Save grande demais");
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}

export function createApp({ store, corsOrigin = "http://localhost:3000" }: AppOptions) {
  return createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
      if (req.method === "OPTIONS") return send(res, 204);
      const url = new URL(req.url ?? "/", "http://localhost");

      if (url.pathname === "/api/health" && req.method === "GET") {
        return send(res, 200, { status: "ok" });
      }

      const match = /^\/api\/saves\/([^/]+)$/.exec(url.pathname);
      if (match) {
        const parsedId = playerIdSchema.safeParse(decodeURIComponent(match[1] ?? ""));
        if (!parsedId.success) throw new HttpError(400, "Identificador de jogador inválido");
        const playerId = parsedId.data;

        if (req.method === "GET") {
          const data = await store.get(playerId);
          return data === null ? send(res, 404, { error: "Nenhum progresso salvo" }) : send(res, 200, { data });
        }
        if (req.method === "PUT") {
          const body = saveBodySchema.safeParse(await readJson(req));
          if (!body.success) throw new HttpError(422, "Formato de save inválido");
          await store.put(playerId, body.data.data);
          return send(res, 204);
        }
        if (req.method === "DELETE") {
          await store.delete(playerId);
          return send(res, 204);
        }
        throw new HttpError(405, "Método não permitido");
      }

      throw new HttpError(404, "Rota não encontrada");
    } catch (error) {
      if (error instanceof HttpError) return send(res, error.status, { error: error.message });
      console.error(error);
      return send(res, 500, { error: "Erro interno" });
    }
  });
}
