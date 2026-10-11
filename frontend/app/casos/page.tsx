"use client";

import { useGame } from "@/components/game/game-provider";
import { CaseCard } from "@/components/game/case-card";
import { LoadingScreen } from "@/components/ui/primitives";
import { getCaseAvailability, getLockReason, listCases } from "@/lib/game/case-loader";

export default function CasesPage() {
  const { ready, save } = useGame();
  if (!ready) return <LoadingScreen />;
  const cases = listCases();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink">📁 Casos especiais</h1>
        <p className="mt-1 text-ink-soft">
          Investigações narrativas e mais longas, com cena do crime, álibis e perfil do autor. Cada caso é liberado quando você identifica o responsável no anterior.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cases.map((caseDef) => (
          <CaseCard
            key={caseDef.id}
            caseDef={caseDef}
            availability={getCaseAvailability(save, caseDef)}
            record={save.records[caseDef.id]}
            lockReason={getLockReason(save, caseDef)}
          />
        ))}
      </div>
    </div>
  );
}
