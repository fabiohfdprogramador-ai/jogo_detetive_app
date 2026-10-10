"use client";

import { useState } from "react";
import { useGame } from "@/components/game/game-provider";
import { ErrorPanel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { t } from "@/lib/i18n";

/** Avisos sobre problemas de leitura ou gravação do progresso. */
export function SaveStatus() {
  const { loadIssue, saveError, recoverFromLoadIssue } = useGame();
  const [confirm, setConfirm] = useState(false);

  if (!loadIssue && !saveError) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      {loadIssue && (
        <ErrorPanel
          title={loadIssue.kind === "corrupted" ? t("save.corrupted") : t("save.newerVersion")}
          description={
            <>
              {loadIssue.kind === "corrupted"
                ? `Detalhe técnico: ${loadIssue.reason}. `
                : `Versão do arquivo: ${loadIssue.version}. Atualize o jogo para continuar com esse progresso. `}
              Enquanto isso, nada será sobrescrito. Você pode jogar normalmente, mas o progresso desta sessão não
              será salvo até que você decida o que fazer.
            </>
          }
          action={
            <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
              Guardar cópia e começar do zero
            </Button>
          }
        />
      )}
      {saveError && !loadIssue && (
        <ErrorPanel
          title={saveError}
          description="Verifique se o navegador permite armazenamento local (modo privado pode bloquear) e se há espaço disponível."
        />
      )}
      <ConfirmDialog
        open={confirm}
        title="Começar do zero?"
        confirmLabel="Guardar cópia e reiniciar"
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void recoverFromLoadIssue();
        }}
      >
        <p>
          Uma cópia do arquivo atual será guardada no navegador com o prefixo <code>rastro:save:backup:</code> e um
          novo progresso vazio será criado.
        </p>
      </ConfirmDialog>
    </div>
  );
}
