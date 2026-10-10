import type { CaseDefinition } from "@/types/case";
import type { GameSession, WarrantRequest } from "@/types/game";
import { attemptCapture, performAction, requestWarrant, startCase, travelTo } from "@/lib/game/engine";

/**
 * Roteiros de solução usados apenas nos testes, para provar que cada caso pode ser
 * resolvido dentro do orçamento de tempo. Ficam fora de /data para não irem ao bundle.
 */
export type Step =
  | { action: string }
  | { travel: string }
  | { warrant: WarrantRequest }
  | { capture: true };

export const WALKTHROUGHS: Record<string, Step[]> = {
  "astrolabio-do-solar": [
    { action: "c1-a-vitrine" },
    { action: "c1-a-registro" },
    { action: "c1-a-cida" },
    { travel: "c1-antiquario" },
    { action: "c1-a-bento" },
    {
      warrant: {
        suspectId: "c1-s-davi",
        traitAnswers: { acesso: "cracha", veiculo: "carro" },
        citedEvidenceIds: ["c1-e-vitrine", "c1-e-motor", "c1-e-oferta"],
      },
    },
    { travel: "c1-terminal" },
    { capture: true },
  ],
  "selos-que-nao-existem": [
    { action: "c2-a-procuracao" },
    { action: "c2-a-pericia" },
    { action: "c2-a-livro-selos" },
    { action: "c2-a-escritura" },
    { travel: "c2-registro" },
    { action: "c2-a-matricula" },
    { action: "c2-a-cruzar" },
    { travel: "c2-cartorio" },
    { travel: "c2-banco" },
    { action: "c2-a-valeria" },
    {
      warrant: {
        suspectId: "c2-s-otavio",
        traitAnswers: { conhecimento: "imobiliario", mao: "canhota", conta: "uruguai" },
        citedEvidenceIds: ["c2-e-assinatura", "c2-e-cruzamento", "c2-e-titular", "c2-e-matricula"],
      },
    },
    { travel: "c2-colonia" },
    { capture: true },
  ],
  "projeto-colibri": [
    { action: "c3-a-cameras" },
    { action: "c3-a-porta" },
    { travel: "c3-coworking" },
    { action: "c3-a-impressora" },
    { action: "c3-a-mesa" },
    {
      warrant: {
        suspectId: "c3-s-bruno",
        traitAnswers: { conhecimento: "software", acesso: "cartao", transporte: "aplicativo" },
        citedEvidenceIds: ["c3-e-cameras", "c3-e-porta", "c3-e-impressora", "c3-e-mesa"],
      },
    },
    { travel: "c3-aeroporto" },
    { travel: "c3-congresso" },
    { capture: true },
  ],
  "retrato-da-viuva-azul": [
    { action: "c4-a-replica" },
    { action: "c4-a-lacre" },
    { travel: "c4-galeria-recife" },
    { action: "c4-a-saidas" },
    { travel: "c4-transportadora" },
    { action: "c4-a-ordem" },
    { action: "c4-a-malaquias" },
    {
      warrant: {
        suspectId: "c4-s-irene",
        traitAnswers: { presenca: "sim", conhecimento: "conservacao", frances: "sim" },
        citedEvidenceIds: ["c4-e-replica", "c4-e-lacre", "c4-e-remessa", "c4-e-malaquias"],
      },
    },
    { travel: "c4-galeria-recife" },
    { travel: "c4-galerie" },
    { travel: "c4-atelie-paris" },
    { action: "c4-a-marc" },
    { travel: "c4-leilao" },
    { capture: true },
  ],
  "tres-versoes-de-uma-noite": [
    { action: "c5-a-expositor" },
    { travel: "c5-cozinha" },
    { action: "c5-a-quadro" },
    { travel: "c5-monitoramento" },
    { action: "c5-a-carmen" },
    { action: "c5-a-radio" },
    { action: "c5-a-computador" },
    {
      warrant: {
        suspectId: "c5-s-mateo",
        traitAnswers: { quadro: "sim", posicao: "corredor", ferimento: "sim" },
        citedEvidenceIds: ["c5-e-expositor", "c5-e-quadro", "c5-e-radio", "c5-e-carmen"],
      },
    },
    { travel: "c5-salao" },
    { travel: "c5-marina" },
    { action: "c5-a-alvaro" },
    { action: "c5-a-capitania" },
    { travel: "c5-colon" },
    { capture: true },
  ],
};

/** Executa os passos; lança erro descritivo se algum falhar. */
export function runSteps(caseDef: CaseDefinition, steps: Step[], session = startCase(caseDef)): GameSession {
  let current = session;
  for (const [index, step] of steps.entries()) {
    const result =
      "action" in step
        ? performAction(caseDef, current, step.action)
        : "travel" in step
          ? travelTo(caseDef, current, step.travel)
          : "warrant" in step
            ? requestWarrant(caseDef, current, step.warrant)
            : attemptCapture(caseDef, current);
    if (!result.ok) throw new Error(`[${caseDef.id}] passo ${index} ${JSON.stringify(step)}: ${result.error}`);
    current = result.session;
  }
  return current;
}
