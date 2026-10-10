import { describe, expect, it } from "vitest";
import {
  attemptCapture,
  performAction,
  requestWarrant,
  revealHint,
  setProfileAnswer,
  startCase,
  toggleEvidenceFlag,
  toggleEvidenceLink,
  toggleSuspectEliminated,
  travelTo,
} from "@/lib/game/engine";
import {
  getAvailableActions,
  getConnections,
  getKnownTraits,
  getProfileMatches,
  getSuspectStatus,
  getVisibleLocations,
} from "@/lib/game/selectors";
import { canTransition, assertTransition } from "@/lib/game/state-machine";
import { getCaseById } from "@/lib/game/case-loader";
import type { GameSession, WarrantRequest } from "@/types/game";
import { runSteps } from "../fixtures/walkthroughs";

const caso = getCaseById("astrolabio-do-solar")!;
const caso4 = getCaseById("retrato-da-viuva-azul")!;

function ok<T extends { ok: boolean }>(result: T) {
  if (!result.ok) throw new Error(`esperado ok: ${JSON.stringify(result)}`);
  return result as Extract<T, { ok: true }>;
}

const correctWarrant: WarrantRequest = {
  suspectId: "c1-s-davi",
  traitAnswers: { acesso: "cracha", veiculo: "carro" },
  citedEvidenceIds: ["c1-e-vitrine", "c1-e-motor", "c1-e-oferta"],
};

function readyForWarrant(): GameSession {
  return runSteps(caso, [
    { action: "c1-a-vitrine" },
    { action: "c1-a-registro" },
    { action: "c1-a-cida" },
    { travel: "c1-antiquario" },
    { action: "c1-a-bento" },
  ]);
}

describe("inicialização do caso", () => {
  it("cria a sessão no local inicial, com orçamento cheio e sem evidências", () => {
    const s = startCase(caso);
    expect(s.caseId).toBe(caso.id);
    expect(s.status).toBe("investigando");
    expect(s.currentLocationId).toBe(caso.startingLocationId);
    expect(s.remainingTime).toBe(caso.timeBudget);
    expect(s.discoveredEvidenceIds).toEqual([]);
    expect(s.visitedLocationIds).toEqual([caso.startingLocationId]);
    expect(s.actionHistory).toHaveLength(1);
  });
});

describe("ações investigativas", () => {
  it("executa uma ação válida, registra evidência e consome tempo", () => {
    const s = startCase(caso);
    const r = ok(performAction(caso, s, "c1-a-vitrine"));
    expect(r.session.discoveredEvidenceIds).toContain("c1-e-vitrine");
    expect(r.session.remainingTime).toBe(caso.timeBudget - 20);
    expect(r.newEvidenceIds).toEqual(["c1-e-vitrine"]);
    expect(r.session.evidenceFoundAt["c1-e-vitrine"]).toBe(20);
    // a sessão original não é alterada
    expect(s.discoveredEvidenceIds).toEqual([]);
  });

  it("rejeita ação inexistente, de outro local ou repetida", () => {
    const s = startCase(caso);
    expect(performAction(caso, s, "nao-existe").ok).toBe(false);
    expect(performAction(caso, s, "c1-a-bento").ok).toBe(false);
    const after = ok(performAction(caso, s, "c1-a-vitrine")).session;
    expect(performAction(caso, after, "c1-a-vitrine").ok).toBe(false);
  });

  it("libera evidências condicionais somente após o requisito", () => {
    const s = startCase(caso);
    expect(getAvailableActions(caso, s, "c1-museu").some((a) => a.id === "c1-a-rondas")).toBe(false);
    expect(performAction(caso, s, "c1-a-rondas").ok).toBe(false);
    const after = ok(performAction(caso, s, "c1-a-registro")).session;
    expect(getAvailableActions(caso, after, "c1-museu").some((a) => a.id === "c1-a-rondas")).toBe(true);
    const r = ok(performAction(caso, after, "c1-a-rondas"));
    expect(r.session.discoveredEvidenceIds).toContain("c1-e-rondas");
  });

  it("registra entrevistas e conta ações desnecessárias", () => {
    let s = startCase(caso);
    s = ok(performAction(caso, s, "c1-a-cida")).session;
    expect(s.interviewedWitnessIds).toContain("c1-w-cida");
    const r = ok(performAction(caso, s, "c1-a-jardim"));
    expect(r.session.unnecessaryActions).toBe(1);
    expect(r.tone).toBe("alerta");
  });
});

describe("deslocamento e mapa", () => {
  it("viaja por uma rota válida e consome o custo informado", () => {
    const s = startCase(caso);
    const destinos = getConnections(caso, s, "c1-museu").map((c) => c.location.id);
    expect(destinos).toContain("c1-oficina");
    expect(destinos).not.toContain("c1-terminal"); // oculto até a pista
    const r = ok(travelTo(caso, s, "c1-oficina"));
    expect(r.session.currentLocationId).toBe("c1-oficina");
    expect(r.session.remainingTime).toBe(caso.timeBudget - 40);
    expect(r.session.visitedLocationIds).toContain("c1-oficina");
  });

  it("rejeita destino oculto, inexistente ou o próprio local", () => {
    const s = startCase(caso);
    expect(travelTo(caso, s, "c1-terminal").ok).toBe(false);
    expect(travelTo(caso, s, "lugar-nenhum").ok).toBe(false);
    expect(travelTo(caso, s, "c1-museu").ok).toBe(false);
  });

  it("revela novos locais quando a pista é encontrada", () => {
    const s = readyForWarrant();
    expect(getVisibleLocations(caso, s).map((l) => l.id)).toContain("c1-terminal");
  });
});

describe("tempo", () => {
  it("encerra como fracasso quando o tempo acaba sem mandado", () => {
    let s = startCase(caso);
    s = { ...s, remainingTime: 10 };
    const r = ok(performAction(caso, s, "c1-a-vitrine"));
    expect(r.session.remainingTime).toBe(0);
    expect(r.session.status).toBe("fracasso");
    expect(r.session.completedAt).not.toBeNull();
    expect(performAction(caso, r.session, "c1-a-registro").ok).toBe(false);
  });

  it("encerra como parcial quando o tempo acaba com mandado autorizado", () => {
    let s = readyForWarrant();
    s = ok(requestWarrant(caso, s, correctWarrant)).session;
    s = { ...s, remainingTime: 5 };
    const r = ok(travelTo(caso, s, "c1-museu"));
    expect(r.session.status).toBe("parcial");
  });
});

describe("suspeitos", () => {
  it("atualiza o estado conforme evidências, álibis e descartes", () => {
    let s = startCase(caso);
    expect(getSuspectStatus(caso, s, "c1-s-livia")).toBe("investigado");
    s = ok(performAction(caso, s, "c1-a-registro")).session;
    expect(getSuspectStatus(caso, s, "c1-s-livia")).toBe("circunstancial");
    s = ok(performAction(caso, s, "c1-a-rondas")).session;
    expect(getSuspectStatus(caso, s, "c1-s-livia")).toBe("alibi_confirmado");
    s = ok(toggleSuspectEliminated(caso, s, "c1-s-heitor")).session;
    expect(getSuspectStatus(caso, s, "c1-s-heitor")).toBe("descartado");
    s = ok(toggleSuspectEliminated(caso, s, "c1-s-heitor")).session;
    expect(getSuspectStatus(caso, s, "c1-s-heitor")).not.toBe("descartado");
  });

  it("mantém características ocultas até a condição ser cumprida", () => {
    const s = startCase(caso4);
    const irene = caso4.suspects.find((x) => x.id === "c4-s-irene")!;
    expect(getKnownTraits(irene, s).presenca).toBeNull();
    expect(getKnownTraits(irene, s).conhecimento).toBe("conservacao");
  });

  it("compara o perfil apenas com características conhecidas", () => {
    let s = startCase(caso);
    s = ok(setProfileAnswer(caso, s, "acesso", "cracha")).session;
    const matches = getProfileMatches(caso, s);
    expect(matches.find((m) => m.suspect.id === "c1-s-heitor")?.compatible).toBe(false);
    expect(matches.find((m) => m.suspect.id === "c1-s-davi")?.compatible).toBe(true);
    expect(setProfileAnswer(caso, s, "acesso", "valor-invalido").ok).toBe(false);
  });
});

describe("quadro de evidências", () => {
  it("marca e relaciona apenas evidências coletadas", () => {
    let s = runSteps(caso, [{ action: "c1-a-vitrine" }, { action: "c1-a-registro" }]);
    expect(toggleEvidenceFlag(s, "c1-e-motor").ok).toBe(false);
    s = ok(toggleEvidenceFlag(s, "c1-e-vitrine")).session;
    expect(s.flaggedEvidenceIds).toEqual(["c1-e-vitrine"]);
    s = ok(toggleEvidenceLink(s, "c1-e-vitrine", "c1-e-registro")).session;
    expect(s.evidenceLinks).toHaveLength(1);
    s = ok(toggleEvidenceLink(s, "c1-e-registro", "c1-e-vitrine")).session;
    expect(s.evidenceLinks).toHaveLength(0);
    expect(toggleEvidenceLink(s, "c1-e-vitrine", "c1-e-vitrine").ok).toBe(false);
  });
});

describe("mandado", () => {
  it("concede o mandado ao responsável com perfil e evidências corretos", () => {
    const r = ok(requestWarrant(caso, readyForWarrant(), correctWarrant));
    expect(r.session.status).toBe("mandado_autorizado");
    expect(r.session.warrant.status).toBe("autorizado");
    expect(r.session.selectedSuspectId).toBe("c1-s-davi");
    expect(getSuspectStatus(caso, r.session, "c1-s-davi")).toBe("identificado");
  });

  it("nega identificação incorreta sem revelar o culpado e aplica penalidade", () => {
    const s = readyForWarrant();
    const r = ok(
      requestWarrant(caso, s, { ...correctWarrant, suspectId: "c1-s-livia", traitAnswers: { acesso: "cracha", veiculo: "moto" } }),
    );
    expect(r.session.status).toBe("investigando");
    expect(r.session.warrant.status).toBe("negado");
    expect(r.message).not.toContain("Davi");
    const rules = caso.completionRules;
    expect(r.session.remainingTime).toBe(s.remainingTime - rules.warrantTimeCost - rules.wrongWarrantTimePenalty);
  });

  it("nega o culpado certo quando o perfil está errado ou faltam evidências", () => {
    const s = readyForWarrant();
    const wrongProfile = ok(
      requestWarrant(caso, s, { ...correctWarrant, traitAnswers: { acesso: "cracha", veiculo: "moto" } }),
    );
    expect(wrongProfile.session.warrant.status).toBe("negado");

    // Mesmo palpite certo, mas sem a pista do antiquário (evidência obrigatória)
    const early = runSteps(caso, [{ action: "c1-a-vitrine" }, { action: "c1-a-registro" }, { action: "c1-a-cida" }]);
    const guess = ok(
      requestWarrant(caso, early, { ...correctWarrant, citedEvidenceIds: ["c1-e-vitrine", "c1-e-motor"] }),
    );
    expect(guess.session.warrant.status).toBe("negado");
    expect(guess.message).toBe(wrongProfile.message);
  });

  it("valida requisitos formais antes de analisar o pedido", () => {
    const start = startCase(caso);
    expect(requestWarrant(caso, start, correctWarrant).ok).toBe(false); // evidências insuficientes
    const s = readyForWarrant();
    expect(requestWarrant(caso, s, { ...correctWarrant, citedEvidenceIds: ["c1-e-vitrine"] }).ok).toBe(false);
    expect(requestWarrant(caso, s, { ...correctWarrant, citedEvidenceIds: ["c1-e-vitrine", "c1-e-rondas"] }).ok).toBe(false);
    expect(requestWarrant(caso, s, { ...correctWarrant, traitAnswers: { acesso: "cracha" } }).ok).toBe(false);
    expect(requestWarrant(caso, s, { ...correctWarrant, suspectId: "fantasma" }).ok).toBe(false);
  });

  it("encerra o caso como fracasso ao esgotar as tentativas", () => {
    let s = readyForWarrant();
    const wrong = { ...correctWarrant, suspectId: "c1-s-heitor" };
    for (let i = 0; i < caso.completionRules.maxWarrantAttempts; i++) {
      s = ok(requestWarrant(caso, s, wrong)).session;
    }
    expect(s.status).toBe("fracasso");
    expect(requestWarrant(caso, s, correctWarrant).ok).toBe(false);
  });
});

describe("captura", () => {
  it("exige mandado autorizado", () => {
    const s = readyForWarrant();
    expect(attemptCapture(caso, s).ok).toBe(false);
  });

  it("falha no local errado e conclui no local certo", () => {
    let s = ok(requestWarrant(caso, readyForWarrant(), correctWarrant)).session;
    const miss = ok(attemptCapture(caso, s));
    expect(miss.session.status).toBe("mandado_autorizado");
    expect(miss.session.captureAttempts).toBe(1);
    s = ok(travelTo(caso, miss.session, "c1-terminal")).session;
    const hit = ok(attemptCapture(caso, s));
    expect(hit.session.status).toBe("concluido");
    expect(hit.session.completedAt).not.toBeNull();
    expect(getSuspectStatus(caso, hit.session, "c1-s-davi")).toBe("capturado");
  });

  it("o suspeito foge após o limite de capturas frustradas", () => {
    let s = ok(requestWarrant(caso, readyForWarrant(), correctWarrant)).session;
    for (let i = 0; i < caso.completionRules.maxCaptureAttempts; i++) s = ok(attemptCapture(caso, s)).session;
    expect(s.status).toBe("parcial");
  });
});

describe("dicas", () => {
  it("libera dicas em ordem até acabarem e respeita a configuração", () => {
    let s = startCase(caso);
    expect(revealHint(caso, s, { hintsEnabled: false }).ok).toBe(false);
    for (let i = 0; i < caso.hints.length; i++) {
      const r = ok(revealHint(caso, s));
      expect(r.narrative).toBe(caso.hints[i]!.text);
      s = r.session;
    }
    expect(s.hintsUsed).toBe(caso.hints.length);
    expect(revealHint(caso, s).ok).toBe(false);
  });
});

describe("máquina de estados", () => {
  it("permite apenas transições válidas", () => {
    expect(canTransition("investigando", "mandado_autorizado")).toBe(true);
    expect(canTransition("investigando", "concluido")).toBe(false);
    expect(canTransition("concluido", "investigando")).toBe(false);
    expect(() => assertTransition("fracasso", "concluido")).toThrow();
  });
});
