"use client";

import { FileText, Sparkles } from "lucide-react";
import type { CaseDefinition, DialogueLine } from "@/types/case";
import { Modal } from "@/components/ui/modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { getEvidence } from "@/lib/game/selectors";
import { cn } from "@/lib/utils/format";

export interface ActionResultView {
  title: string;
  message: string;
  tone: "sucesso" | "info" | "alerta" | "erro";
  narrative?: string;
  dialogue?: DialogueLine[];
  witnessName?: string;
  newEvidenceIds: string[];
  finished: boolean;
}

/** Mostra o resultado de uma ação: diálogo, narrativa e evidências novas. */
export function ActionResultDialog({
  caseDef,
  result,
  reportHref,
  onClose,
}: {
  caseDef: CaseDefinition;
  result: ActionResultView | null;
  reportHref: string;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={result.title}
      footer={
        result.finished ? (
          <ButtonLink href={reportHref}>Ver relatório final</ButtonLink>
        ) : (
          <Button onClick={onClose}>Continuar</Button>
        )
      }
    >
      <div className="space-y-4">
        {result.dialogue && result.dialogue.length > 0 && (
          <div className="space-y-2" aria-label="Diálogo">
            {result.dialogue.map((line, i) => (
              <div key={i} className={cn("flex", line.speaker === "agente" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    line.speaker === "agente"
                      ? "rounded-br-sm bg-accent/15 text-ink"
                      : "rounded-bl-sm border border-line bg-surface-2 text-ink",
                  )}
                >
                  <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-muted uppercase">
                    {line.speaker === "agente" ? "Você" : result.witnessName ?? "Testemunha"}
                  </span>
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        )}
        {result.narrative && <p className="text-ink-soft">{result.narrative}</p>}
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            {
              sucesso: "border-ok/50 bg-ok/10 text-ok",
              info: "border-info/50 bg-info/10 text-info",
              alerta: "border-warn/50 bg-warn/10 text-warn",
              erro: "border-danger/50 bg-danger/10 text-danger",
            }[result.tone],
          )}
        >
          {result.message}
        </p>
        {result.newEvidenceIds.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
              <Sparkles className="size-4 text-accent" aria-hidden /> Novas evidências
            </p>
            <ul className="space-y-2">
              {result.newEvidenceIds.map((id) => {
                const e = getEvidence(caseDef, id);
                if (!e) return null;
                return (
                  <li key={id} className="rounded-lg border border-accent/40 bg-surface-2 p-3">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      <FileText className="size-4 text-accent" aria-hidden />
                      {e.title}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{e.description}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
