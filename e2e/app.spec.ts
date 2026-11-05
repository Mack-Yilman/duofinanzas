import { test, expect } from "./fixtures";
import { mockSupabase } from "./mock-supabase";
import { LEGAL } from "../lib/legal";

const BASE = "/duofinanzas";
const CONSENT = LEGAL.version; // sin el aviso de consentimiento

test.describe("app con sesión (Supabase simulado)", () => {
  test.beforeEach(async ({ page, problems }) => {
    void problems; // activa el bloqueo de red externa y el registro de errores
    await mockSupabase(page, CONSENT);
  });

  test("dashboard muestra presupuestos con alerta al 85 %", async ({ page, problems }) => {
    await page.goto(`${BASE}/`);
    await expect(page.getByText("Presupuestos del periodo")).toBeVisible();
    await expect(page.getByText(/85 %/)).toBeVisible();
    await expect(page.getByText("1 alerta")).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("gastos: exporta CSV con cabecera y datos", async ({ page, problems }) => {
    await page.goto(`${BASE}/expenses/`);
    await expect(page.getByText("Supermercado").first()).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "CSV" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^duofinanzas-gastos-.*\.csv$/);
    const text = (await (await download.createReadStream()).toArray()).join("");
    expect(text).toContain("Fecha;Descripción;Categoría");
    expect(text).toContain("Supermercado;Comida;85,00;PEN");
    expect(problems).toEqual([]);
  });

  test("recurrentes: lista la plantilla y su próxima fecha", async ({ page, problems }) => {
    await page.goto(`${BASE}/recurring/`);
    await expect(page.getByRole("heading", { name: "Gastos recurrentes" })).toBeVisible();
    await expect(page.getByText("🍔 Alquiler", { exact: true })).toBeVisible();
    await expect(page.getByText(/día 5 · paga Ana · compartido · próximo/)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("resumen anual con totales y gráfico", async ({ page, problems }) => {
    await page.goto(`${BASE}/summary/`);
    await expect(page.getByRole("heading", { name: `Resumen ${new Date().getFullYear()}` })).toBeVisible();
    await expect(page.getByRole("img", { name: "Gastos por mes del año" })).toBeVisible();
    await expect(page.getByText("🍔 Comida")).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("categorías permiten editar el presupuesto", async ({ page }) => {
    await page.goto(`${BASE}/categories/`);
    await expect(page.getByLabel("Presupuesto de Comida")).toHaveValue("100");
  });

  test("ajustes ofrece activar la verificación en dos pasos", async ({ page }) => {
    await page.route("**/auth/v1/factors**", (r) => r.fulfill({ json: [] }));
    await page.goto(`${BASE}/settings/`);
    await expect(page.getByText("Verificación en dos pasos")).toBeVisible();
  });
});
