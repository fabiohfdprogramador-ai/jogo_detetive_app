"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import type { TutorialStep } from "@/types/case";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function TutorialOverlay({
  steps,
  open,
  onFinish,
}: {
  steps: TutorialStep[];
  open: boolean;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;

  return (
    <Modal
      open={open}
      onClose={onFinish}
      title={
        <span className="flex items-center gap-2">
          <GraduationCap className="size-5 text-accent" aria-hidden />
          Tutorial · {step.title}
        </span>
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onFinish}>
            Pular tutorial
          </Button>
          {index > 0 && (
            <Button variant="secondary" onClick={() => setIndex((i) => i - 1)}>
              Voltar
            </Button>
          )}
          <Button onClick={() => (last ? onFinish() : setIndex((i) => i + 1))}>{last ? "Começar" : "Próximo"}</Button>
        </>
      }
    >
      <p className="text-ink-soft">{step.text}</p>
      <p className="mt-4 text-xs text-muted" aria-live="polite">
        Passo {index + 1} de {steps.length}
      </p>
      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((s, i) => (
          <span key={s.id} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-surface-3"}`} />
        ))}
      </div>
    </Modal>
  );
}
