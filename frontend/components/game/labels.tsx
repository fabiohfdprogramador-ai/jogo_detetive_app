import {
  CheckCircle2,
  CircleDashed,
  FileWarning,
  Lock,
  PlayCircle,
  ShieldCheck,
  UserCheck,
  UserSearch,
  UserX,
  XCircle,
} from "lucide-react";
import type { Difficulty } from "@/types/case";
import type { CaseAvailability, SessionStatus } from "@/types/game";
import type { SuspectStatus } from "@/types/suspect";
import { Badge, type Tone } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";

const difficultyTone: Record<Difficulty, Tone> = { facil: "ok", intermediario: "warn", avancado: "danger" };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const dots = { facil: 1, intermediario: 2, avancado: 3 }[difficulty];
  return (
    <Badge tone={difficultyTone[difficulty]}>
      <span aria-hidden>{"●".repeat(dots) + "○".repeat(3 - dots)}</span>
      {t(`difficulty.${difficulty}`)}
    </Badge>
  );
}

export function AvailabilityBadge({ availability }: { availability: CaseAvailability }) {
  const map: Record<CaseAvailability, { tone: Tone; icon: React.ReactNode }> = {
    bloqueado: { tone: "neutral", icon: <Lock className="size-3.5" aria-hidden /> },
    disponivel: { tone: "info", icon: <CircleDashed className="size-3.5" aria-hidden /> },
    em_andamento: { tone: "accent", icon: <PlayCircle className="size-3.5" aria-hidden /> },
    concluido: { tone: "ok", icon: <CheckCircle2 className="size-3.5" aria-hidden /> },
  };
  const { tone, icon } = map[availability];
  return (
    <Badge tone={tone} icon={icon}>
      {t(`availability.${availability}`)}
    </Badge>
  );
}

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { tone: Tone; icon: React.ReactNode }> = {
    investigando: { tone: "info", icon: <UserSearch className="size-3.5" aria-hidden /> },
    mandado_autorizado: { tone: "accent", icon: <ShieldCheck className="size-3.5" aria-hidden /> },
    concluido: { tone: "ok", icon: <CheckCircle2 className="size-3.5" aria-hidden /> },
    parcial: { tone: "warn", icon: <FileWarning className="size-3.5" aria-hidden /> },
    fracasso: { tone: "danger", icon: <XCircle className="size-3.5" aria-hidden /> },
  };
  const { tone, icon } = map[status];
  return (
    <Badge tone={tone} icon={icon}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function SuspectStatusBadge({ status }: { status: SuspectStatus }) {
  const map: Record<SuspectStatus, { tone: Tone; icon: React.ReactNode }> = {
    investigado: { tone: "neutral", icon: <UserSearch className="size-3.5" aria-hidden /> },
    circunstancial: { tone: "warn", icon: <FileWarning className="size-3.5" aria-hidden /> },
    alibi_confirmado: { tone: "info", icon: <ShieldCheck className="size-3.5" aria-hidden /> },
    descartado: { tone: "neutral", icon: <UserX className="size-3.5" aria-hidden /> },
    identificado: { tone: "accent", icon: <UserCheck className="size-3.5" aria-hidden /> },
    capturado: { tone: "ok", icon: <CheckCircle2 className="size-3.5" aria-hidden /> },
  };
  const { tone, icon } = map[status];
  return (
    <Badge tone={tone} icon={icon}>
      {t(`suspect.${status}`)}
    </Badge>
  );
}
