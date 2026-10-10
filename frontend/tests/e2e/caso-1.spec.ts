import { expect, test, type Page } from "@playwright/test";

/** Abre a área do painel correto em telas pequenas (navegação inferior) ou grandes (abas). */
async function openPanel(page: Page, name: "Local" | "Evidências" | "Suspeitos" | "Mandado") {
  const mobileNav = page.getByRole("navigation", { name: "Painéis da investigação (celular)" });
  if (await mobileNav.isVisible()) {
    await mobileNav.getByRole("button", { name }).click();
  } else if (name !== "Local") {
    await page.getByRole("tab", { name: new RegExp(name) }).click();
  }
}

async function doAction(page: Page, label: string) {
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();
}

async function travel(page: Page, destination: string) {
  await page.getByRole("button", { name: new RegExp(`^${destination}.*\\d+ min$`) }).click();
  await page.getByRole("button", { name: /^Viajar \(/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Viajar" }).click();
  await expect(page.getByText(new RegExp(`Você está em ${destination}`))).toBeVisible();
}

test("resolve o primeiro caso de ponta a ponta e mantém o progresso após recarregar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Novo caso" }).click();
  await expect(page.getByRole("heading", { name: "O Astrolábio do Solar" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar investigação" }).click();

  // Tutorial
  await expect(page.getByRole("dialog")).toContainText("Tutorial");
  await page.getByRole("button", { name: "Pular tutorial" }).click();

  await openPanel(page, "Local");
  await doAction(page, "Examinar a vitrine 7");
  await doAction(page, "Consultar o controle de acesso");
  await doAction(page, "Conversar com Dona Cida");
  await travel(page, "Antiquário Arruda & Filhos");
  await doAction(page, "Entrevistar Seu Bento");

  // Mandado
  await openPanel(page, "Mandado");
  await page.getByRole("button", { name: "Crachá eletrônico" }).click();
  await page.getByRole("button", { name: "Carro de passeio" }).click();
  await page.getByRole("radio", { name: /Davi Quintela/ }).check();
  for (const title of ["Vitrine aberta sem arrombamento", "Veículo saindo pela rua lateral", "Oferta feita ao antiquário"]) {
    await page.getByRole("checkbox", { name: title }).check();
  }
  await page.getByRole("button", { name: "Solicitar mandado" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Protocolar" }).click();
  await expect(page.getByRole("dialog")).toContainText("Mandado concedido contra Davi Quintela");
  await page.getByRole("dialog").getByRole("button", { name: "Continuar" }).click();

  // Captura
  await openPanel(page, "Local");
  await travel(page, "Terminal Marítimo de São Joaquim");
  await page.getByRole("button", { name: /Executar captura aqui/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Executar captura" }).click();
  await expect(page.getByRole("dialog")).toContainText("Captura realizada");
  await page.getByRole("dialog").getByRole("link", { name: "Ver relatório final" }).click();

  // Relatório
  await expect(page.getByText("Caso concluído").first()).toBeVisible();
  await expect(page.getByText("Davi Quintela").first()).toBeVisible();

  // Persistência: o caso 2 foi liberado e continua liberado após recarregar
  await page.goto("/casos");
  await page.reload();
  const caso2 = page.getByRole("heading", { name: "Selos que Não Existem" }).locator("xpath=ancestor::section[1]");
  await expect(caso2.getByRole("link", { name: "Abrir dossiê" })).toBeVisible();
});

test("não há rolagem horizontal nas telas principais", async ({ page }) => {
  for (const path of ["/", "/casos", "/casos/astrolabio-do-solar", "/desempenho", "/configuracoes"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0);
  }
});
