import type { Metadata } from "next";
import { ChaseGame } from "@/components/chase/chase-game";

export const metadata: Metadata = { title: "Missão em andamento" };

export default function ChaseGamePage() {
  return <ChaseGame />;
}
