import { AE, AR, AU, BR, CA, CL, CN, CU, DE, EG, ES, FR, GB, GR, IN, IT, JP, KE, MA, MX, NL, PE, PT, TH, TR, US, ZA } from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils/format";

// Bandeiras em SVG (pacote country-flag-icons, licença MIT): emojis de bandeira não aparecem no Windows.
const FLAGS: Record<string, typeof BR> = {
  AE, AR, AU, BR, CA, CL, CN, CU, DE, EG, ES, FR, GB, GR, IN, IT, JP, KE, MA, MX, NL, PE, PT, TH, TR, US, ZA,
};

export function Flag({ code, country, className }: { code: string; country: string; className?: string }) {
  const Svg = FLAGS[code];
  if (!Svg) return null;
  return <Svg title={`Bandeira: ${country}`} className={cn("inline-block h-4 w-6 shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/30", className)} />;
}
