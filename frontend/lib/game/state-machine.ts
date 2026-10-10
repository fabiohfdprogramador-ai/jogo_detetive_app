import type { SessionStatus } from "@/types/game";

const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  investigando: ["mandado_autorizado", "fracasso"],
  mandado_autorizado: ["concluido", "parcial"],
  concluido: [],
  parcial: [],
  fracasso: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: SessionStatus, to: SessionStatus) {
    super(`Transição inválida: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: SessionStatus, to: SessionStatus) {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
