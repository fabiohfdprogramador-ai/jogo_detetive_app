import { describe, expect, it } from "vitest";
import { getCaseById } from "@/lib/game/case-loader";
import { calculateScore, deductionQuality, maxScore } from "@/lib/game/scoring";
import { revealHint, startCase } from "@/lib/game/engine";
import { WALKTHROUGHS, runSteps } from "../fixtures/walkthroughs";

const caso = getCaseById("astrolabio-do-solar")!;

describe("pontuação", () => {
  it("dá zero e classificação inconclusiva a uma sessão recém-iniciada", () => {
    const score = calculateScore(caso, startCase(caso));
    expect(score.total).toBe(0);
    expect(score.rating).toBe("inconclusivo");
    expect(score.max).toBe(maxScore(caso));
  });

  it("calcula a pontuação de uma solução eficiente com linhas detalhadas", () => {
    const s = runSteps(caso, WALKTHROUGHS[caso.id]!);
    const score = calculateScore(caso, s);
    const sum = score.lines.reduce((a, l) => a + l.points, 0);
    expect(score.total).toBe(Math.min(score.max, Math.max(0, sum)));
    expect(score.lines.find((l) => l.label.includes("Identificação"))?.points).toBe(400);
    expect(score.lines.find((l) => l.label === "Captura")?.points).toBe(300);
    expect(score.total).toBeGreaterThan(score.max * 0.55);
    expect(["agente_de_campo", "elite"]).toContain(score.rating);
  });

  it("aplica penalidades por dicas, ações desnecessárias e mandados negados", () => {
    const base = runSteps(caso, WALKTHROUGHS[caso.id]!);
    const baseScore = calculateScore(caso, base).total;

    let withHint = startCase(caso);
    const hint = revealHint(caso, withHint);
    if (!hint.ok) throw new Error(hint.error);
    withHint = runSteps(caso, WALKTHROUGHS[caso.id]!, hint.session);
    expect(calculateScore(caso, withHint).total).toBe(baseScore - caso.hints[0]!.penalty);

    const wasteful = runSteps(caso, [{ action: "c1-a-jardim" }, ...WALKTHROUGHS[caso.id]!]);
    const wastefulScore = calculateScore(caso, wasteful);
    expect(wastefulScore.lines.some((l) => l.label === "Ações desnecessárias" && l.points === -10)).toBe(true);
    expect(wastefulScore.total).toBeLessThan(baseScore);
  });

  it("nunca fica negativa", () => {
    let s = startCase(caso);
    s = { ...s, hintsUsed: 4, unnecessaryActions: 50, warrant: { ...s.warrant, attempts: 3 } };
    expect(calculateScore(caso, s).total).toBe(0);
  });

  it("mede a qualidade da dedução pelas evidências citadas", () => {
    const s = runSteps(caso, WALKTHROUGHS[caso.id]!);
    const q = deductionQuality(caso, s);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThanOrEqual(1);
  });
});
