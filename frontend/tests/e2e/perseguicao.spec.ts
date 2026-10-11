import { expect, test, type Page } from "@playwright/test";
import { SUSPECTS } from "../../data/world/suspects";
import { getCity } from "../../data/world/cities";

interface SavedChase {
  case: {
    route: string[];
    culpritId: string;
    revealedTraits: string[];
    stops: Record<string, { spots: { id: string; place: string; hideout?: boolean }[] }>;
  };
}

const PLACE_LABEL: Record<string, string> = {
  banco: "Banco",
  aeroporto: "Aeroporto",
  biblioteca: "Biblioteca",
  museu: "Museu",
  mercado: "Mercado",
  hotel: "Hotel",
  porto: "Porto",
  cafe: "Café",
};

/** Lê a missão salva para saber a rota (o teste "trapaceia" para navegar rápido). */
async function readChase(page: Page): Promise<SavedChase> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("rastro:save") ?? "{}").chase.active);
}

test("persegue o suspeito pelo mundo, emite o mandado e faz a captura", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/perseguicao");
  await page.getByRole("button", { name: "Nova missão" }).click();
  await expect(page).toHaveURL(/perseguicao\/jogo/);
  await expect(page.getByRole("dialog")).toContainText("Plantão");
  await page.getByRole("dialog").getByRole("button", { name: /Aceitar missão|Pular e aceitar/ }).click();

  const chase = await readChase(page);
  const route = chase.case.route;

  for (let i = 0; i < route.length - 1; i++) {
    // Investiga o primeiro lugar e lê o depoimento
    const spot = chase.case.stops[route[i]!]!.spots[0]!;
    await page.getByRole("button", { name: new RegExp(PLACE_LABEL[spot.place]!) }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();

    // Viaja para a próxima cidade da rota
    await page.getByRole("button", { name: /Viajar/ }).click();
    const nextName = getCity(route[i + 1]!)!.name;
    await page.locator(`[data-city-id="${route[i + 1]}"]`).click();
    await page.getByRole("button", { name: /Embarcar para/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(nextName);
  }

  // Central de Dados: seleciona as características do responsável
  const culprit = await page.evaluate(() => JSON.parse(localStorage.getItem("rastro:save") ?? "{}").chase.active.case.culpritId);
  expect(culprit).toBe(chase.case.culpritId);
  await page.getByRole("button", { name: /Central de Dados/ }).click();
  const traits: Record<string, string> = SUSPECTS.find((s) => s.id === culprit)!.traits;
  for (const key of chase.case.revealedTraits) {
    await page.locator(`[data-trait="${key}"][data-value="${traits[key]}"]`).click();
  }
  await page.getByRole("button", { name: /Emitir mandado contra/ }).click();
  await expect(page.getByText(/Mandado:/)).toBeVisible();

  // Cidade final: procura o esconderijo
  await page.getByRole("button", { name: /Investigar/ }).click();
  const finalSpots = chase.case.stops[route[route.length - 1]!]!.spots;
  const hideout = finalSpots.find((s) => s.hideout)!;
  await page.getByRole("button", { name: new RegExp(PLACE_LABEL[hideout.place]!) }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Captura realizada");
  await expect(page.getByRole("dialog")).toContainText("Promoção");

  // O placar e a patente persistem após recarregar
  await page.goto("/perseguicao");
  await page.reload();
  await expect(page.getByText("Investigador(a) Júnior").first()).toBeVisible();
});
