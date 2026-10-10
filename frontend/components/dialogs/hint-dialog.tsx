"use client";

import { Lightbulb } from "lucide-react";
import type { CaseDefinition } from "@/types/case";
import type { GameSession } from "@/types/game";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { isFinished } from "@/lib/game/selectors";

export function HintDialog({
  open,
  caseDef,
  session,
  hintsEnabled,
  onReveal,
  onClose,
}: {
  open: boolean;
  caseDef: CaseDefinition;
  session: GameSession;
  hintsEnabled: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  const used = caseDef.hints.slice(0, session.hintsUsed);
  const next = caseDef.hints[session.hintsUsed];
  const canReveal = hintsEnabled && !!next && !isFinished(session);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dicas da coordenação"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {canReveal && (
            <Button icon={<Lightbulb className="size-4" aria-hidden />} onClick={onReveal}>
              Liberar dica {session.hintsUsed + 1} (−{next.penalty} pts)
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-ink-soft">
          As dicas começam sutis e ficam mais explícitas. Cada uma reduz a pontuação final do caso, e o desconto é
          mostrado antes de você confirmar.
        </p>
        {!hintsEnabled && <p className="text-warn">As dicas estão desativadas nas configurações.</p>}
        {used.length === 0 ? (
          <p className="text-muted">Nenhuma dica utilizada neste caso.</p>
        ) : (
          <ol className="space-y-2">
            {used.map((hint, i) => (
              <li key={i} className="rounded-lg border border-accent/40 bg-surface-2 p-3">
                <p className="text-xs font-semibold text-accent uppercase">
                  Dica {i + 1} · −{hint.penalty} pts
                </p>
                <p className="mt-1 text-ink">{hint.text}</p>
              </li>
            ))}
          </ol>
        )}
        {!next && used.length > 0 && <p className="text-muted">Todas as dicas deste caso já foram usadas.</p>}
      </div>
    </Modal>
  );
}
