import { describe, expect, it } from "vitest";
import { listCases } from "@/lib/game/case-loader";
import { validateCase } from "@/lib/game/validation";
import { calculateScore, maxScore } from "@/lib/game/scoring";
import { requestWarrant } from "@/lib/game/engine";
import { WALKTHROUGHS, runSteps } from "../fixtures/walkthroughs";

const cases = listCases();

describe("campanha", () => {
  it("tem pelo menos cinco casos com ids únicos e progressão encadeada", () => {
    expect(cases.length).toBeGreaterThanOrEqual(5);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    expect(cases[0]!.unlockAfter).toEqual([]);
    for (const c of cases) for (const dep of c.unlockAfter) expect(cases.some((o) => o.id === dep)).toBe(true);
  });

  it("cobre os três níveis de dificuldade e categorias distintas", () => {
    expect(new Set(cases.map((c) => c.difficulty))).toEqual(new Set(["facil", "intermediario", "avancado"]));
    expect(new Set(cases.map((c) => c.category)).size).toBe(cases.length);
  });

  it("o primeiro caso tem tutorial", () => {
    expect(cases[0]!.tutorial?.length).toBeGreaterThan(0);
  });

  it("o validador detecta casos quebrados ou ambíguos", () => {
    const broken = structuredClone(cases[0]!);
    // inocente com o mesmo perfil do culpado
    const culprit = broken.suspects.find((s) => s.id === broken.solution.culpritId)!;
    broken.suspects[0]!.traits = { ...culprit.traits };
    // evidência obrigatória que nenhuma ação gera
    broken.solution.requiredEvidenceIds.push("inexistente");
    // local inalcançável
    broken.locations.push({ ...broken.locations[0]!, id: "ilha-isolada" });
    const issues = validateCase(broken).join("\n");
    expect(issues).toContain("indistinguível");
    expect(issues).toContain("inexistente");
    expect(issues).toContain("ilha-isolada inalcançável");
  });
});

describe.each(cases.map((c) => [c.title, c] as const))("consistência: %s", (_title, caseDef) => {
  it("não tem referências quebradas e é dedutível", () => {
    expect(validateCase(caseDef)).toEqual([]);
  });

  it("anuncia a recompensa igual à pontuação máxima possível", () => {
    expect(caseDef.rewardPoints).toBe(maxScore(caseDef));
  });

  it("pode ser solucionado dentro do orçamento de tempo", () => {
    const steps = WALKTHROUGHS[caseDef.id];
    expect(steps, `roteiro ausente para ${caseDef.id}`).toBeDefined();
    const session = runSteps(caseDef, steps!);
    expect(session.status).toBe("concluido");
    expect(session.remainingTime).toBeGreaterThan(0);
    expect(calculateScore(caseDef, session).rating).not.toBe("inconclusivo");
  });

  it("nega o mandado para qualquer suspeito inocente, mesmo com o perfil dele", () => {
    const steps = WALKTHROUGHS[caseDef.id]!;
    const warrantIndex = steps.findIndex((s) => "warrant" in s);
    const ready = runSteps(caseDef, steps.slice(0, warrantIndex));
    const warrantStep = steps[warrantIndex] as { warrant: { citedEvidenceIds: string[] } };
    for (const suspect of caseDef.suspects) {
      if (suspect.id === caseDef.solution.culpritId) continue;
      const result = requestWarrant(caseDef, ready, {
        suspectId: suspect.id,
        traitAnswers: { ...suspect.traits },
        citedEvidenceIds: warrantStep.warrant.citedEvidenceIds,
      });
      if (result.ok) expect(result.session.warrant.status).toBe("negado");
    }
  });
});
