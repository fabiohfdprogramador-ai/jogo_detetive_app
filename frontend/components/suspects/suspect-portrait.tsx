import { cn } from "@/lib/utils/format";

/**
 * Retrato ilustrado original, gerado a partir de um matiz e das iniciais: silhueta em
 * estilo de ficha policial, sem uso de imagens de terceiros.
 */
export function SuspectPortrait({
  name,
  hue,
  size = "md",
  muted = false,
}: {
  name: string;
  hue: number;
  size?: "sm" | "md" | "lg";
  muted?: boolean;
}) {
  const initials = name
    .replace(/^(Dra?\.|Dr\.|Sr\.|Sra\.)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const bg = `hsl(${hue} 35% 22%)`;
  const fg = `hsl(${hue} 45% 62%)`;
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Retrato ilustrado de ${name}`}
      className={cn(
        "shrink-0 rounded-lg border border-line-strong",
        { sm: "size-10", md: "size-14", lg: "size-20" }[size],
        muted && "opacity-50 grayscale",
      )}
    >
      <rect width="64" height="64" fill={bg} />
      {[16, 28, 40, 52].map((y) => (
        <line key={y} x1="0" x2="64" y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.06" />
      ))}
      <circle cx="32" cy="25" r="11" fill={fg} fillOpacity="0.55" />
      <path d="M10 64c2-14 11-21 22-21s20 7 22 21z" fill={fg} fillOpacity="0.45" />
      <text
        x="32"
        y="29"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#0a1120"
        fontFamily="ui-sans-serif, system-ui"
      >
        {initials}
      </text>
    </svg>
  );
}
