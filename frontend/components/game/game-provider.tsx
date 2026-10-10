"use client";

/**
 * Estado global do jogo no navegador. Carrega o salvamento uma vez, expõe o progresso
 * e aplica as funções puras do motor, salvando automaticamente após cada mudança.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession, GameSettings, SaveData } from "@/types/game";
import type { EngineResult } from "@/lib/game/engine";
import { startCase } from "@/lib/game/engine";
import { getCaseById } from "@/lib/game/case-loader";
import {
  applySessionUpdate,
  createEmptySave,
  registerSessionStart,
  removeSession,
  updateSettings as applySettings,
} from "@/lib/persistence/save-manager";
import { createBrowserRepository, type SaveRepository } from "@/lib/persistence/storage";
import { t } from "@/lib/i18n";

type LoadIssue = { kind: "corrupted"; reason: string } | { kind: "newer_version"; version: number };

interface GameContextValue {
  ready: boolean;
  save: SaveData;
  storageKind: SaveRepository["kind"];
  loadIssue: LoadIssue | null;
  saveError: string | null;
  getSession(caseId: string): GameSession | undefined;
  startNewSession(caseId: string): GameSession | null;
  run(caseId: string, fn: (caseDef: CaseDefinition, session: GameSession) => EngineResult): EngineResult;
  resetCase(caseId: string): void;
  resetCampaign(): Promise<void>;
  updateSettings(settings: Partial<GameSettings>): void;
  setTutorialCompleted(done: boolean): void;
  /** Descarta o salvamento ilegível (após guardar uma cópia) e começa do zero. */
  recoverFromLoadIssue(): Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<SaveRepository | null>(null);
  const [ready, setReady] = useState(false);
  const [save, setSave] = useState<SaveData>(() => createEmptySave());
  const [loadIssue, setLoadIssue] = useState<LoadIssue | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    const repo = createBrowserRepository();
    repoRef.current = repo;
    let cancelled = false;
    repo.load().then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        saveRef.current = result.data;
        setSave(result.data);
      } else if (result.status === "corrupted") {
        setLoadIssue({ kind: "corrupted", reason: result.reason });
      } else if (result.status === "newer_version") {
        setLoadIssue({ kind: "newer_version", version: result.version });
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Aplica preferências de acessibilidade no documento.
  useEffect(() => {
    document.documentElement.dataset.textSize = save.settings.textSize;
    document.documentElement.dataset.motion = save.settings.reducedMotion;
  }, [save.settings.textSize, save.settings.reducedMotion]);

  /** Atualiza o estado e persiste. Enquanto houver problema de leitura, não sobrescreve nada. */
  const commit = useCallback(
    (next: SaveData) => {
      saveRef.current = next;
      setSave(next);
      if (loadIssue || !repoRef.current) return;
      repoRef.current.save(next).then(
        () => setSaveError(null),
        () => setSaveError(t("save.writeFailed")),
      );
    },
    [loadIssue],
  );

  const getSession = useCallback((caseId: string) => save.sessions[caseId], [save.sessions]);

  const startNewSession = useCallback(
    (caseId: string) => {
      const caseDef = getCaseById(caseId);
      if (!caseDef) return null;
      const session = startCase(caseDef);
      commit(registerSessionStart(saveRef.current, session));
      return session;
    },
    [commit],
  );

  const run = useCallback(
    (caseId: string, fn: (caseDef: CaseDefinition, session: GameSession) => EngineResult): EngineResult => {
      const caseDef = getCaseById(caseId);
      const session = saveRef.current.sessions[caseId];
      if (!caseDef || !session) return { ok: false, error: t("engine.notFound") };
      const result = fn(caseDef, session);
      if (result.ok) commit(applySessionUpdate(saveRef.current, caseDef, result.session));
      return result;
    },
    [commit],
  );

  const resetCase = useCallback((caseId: string) => commit(removeSession(saveRef.current, caseId)), [commit]);

  const resetCampaign = useCallback(async () => {
    const fresh = createEmptySave();
    fresh.settings = { ...saveRef.current.settings };
    await repoRef.current?.clear().catch(() => undefined);
    commit(fresh);
  }, [commit]);

  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => commit(applySettings(saveRef.current, settings)),
    [commit],
  );

  const setTutorialCompleted = useCallback(
    (done: boolean) => commit({ ...saveRef.current, tutorialCompleted: done }),
    [commit],
  );

  const recoverFromLoadIssue = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    await repo.backupCorrupted();
    const fresh = createEmptySave();
    saveRef.current = fresh;
    setSave(fresh);
    setLoadIssue(null);
    await repo.save(fresh).catch(() => setSaveError(t("save.writeFailed")));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      save,
      storageKind: repoRef.current?.kind ?? "local",
      loadIssue,
      saveError,
      getSession,
      startNewSession,
      run,
      resetCase,
      resetCampaign,
      updateSettings,
      setTutorialCompleted,
      recoverFromLoadIssue,
    }),
    [
      ready,
      save,
      loadIssue,
      saveError,
      getSession,
      startNewSession,
      run,
      resetCase,
      resetCampaign,
      updateSettings,
      setTutorialCompleted,
      recoverFromLoadIssue,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame precisa estar dentro de GameProvider");
  return ctx;
}
