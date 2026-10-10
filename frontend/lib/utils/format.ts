/** Formata uma duração em minutos como "2 h 15 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Relógio do jogo: dia e hora a partir do início do caso. */
export function formatGameClock(clockStart: number, elapsed: number): string {
  const absolute = clockStart + Math.max(0, elapsed);
  const day = Math.floor(absolute / 1440) + 1;
  const minutesOfDay = absolute % 1440;
  const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, "0");
  const mm = String(minutesOfDay % 60).padStart(2, "0");
  return `Dia ${day}, ${hh}:${mm}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
