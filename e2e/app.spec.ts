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

test.describe("v1.3.0: estadísticas y manejo de datos", () => {
  test("dashboard: comparativa, proyección y tasa de ahorro", async ({ page, problems }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/`);
    await expect(page.getByText("Gasto del periodo")).toBeVisible();
    await expect(page.getByText("Proyección de cierre")).toBeVisible();
    await expect(page.getByText("Tasa de ahorro")).toBeVisible();
    await expect(page.getByText("Gasto acumulado vs. periodo anterior")).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("metas: fecha estimada según el ritmo de aportes", async ({ page }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/goals/`);
    await expect(page.getByText(/Al ritmo de .*\/mes la alcanzarán en/)).toBeVisible();
  });

  test("gastos: buscar y filtrar", async ({ page }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/expenses/`);
    const search = page.getByRole("searchbox", { name: "Buscar gastos" });
    await search.fill("super");
    await expect(page).toHaveURL(/q=super/);
    await expect(page.getByText("Supermercado").first()).toBeVisible();
    await search.fill("zzz");
    await expect(page.getByText("Ningún gasto coincide con los filtros")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar" }).click();
    await page.getByLabel("Filtrar por estado").selectOption("settled");
    await expect(page.getByText("Ningún gasto coincide con los filtros")).toBeVisible();
  });

  test("ingresos: editar con el formulario precargado", async ({ page }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/income/`);
    await page.getByRole("link", { name: "Editar Sueldo" }).first().click();
    await expect(page).toHaveURL(/\/income\/edit\/?\?id=i1/);
    await expect(page.getByLabel("Monto")).toHaveValue("3000");
    await expect(page.getByLabel(/Activo/)).toBeChecked();
  });

  test("liquidar todo envía un único PATCH", async ({ page }) => {
    const mutations: import("./mock-supabase").Mutation[] = [];
    await mockSupabase(page, CONSENT, mutations);
    await page.goto(`${BASE}/expenses/`);
    await page.getByRole("button", { name: "Liquidar todo" }).click();
    await page.getByRole("button", { name: "Confirmar liquidación" }).click();
    await expect.poll(() => mutations.filter((m) => m.table === "expenses" && m.method === "PATCH").length).toBe(1);
    const patch = mutations.find((m) => m.method === "PATCH")!;
    expect(patch.body).toEqual({ is_settled: true });
    expect(decodeURIComponent(patch.url)).toContain("id=in.(e1)");
  });

  test("importar CSV: vista previa con duplicado y una fila nueva", async ({ page }) => {
    const mutations: import("./mock-supabase").Mutation[] = [];
    await mockSupabase(page, CONSENT, mutations);
    await page.goto(`${BASE}/expenses/import/`);
    const today = new Date();
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const csv = `Fecha;Descripción;Categoría;Monto;Moneda\n${d};Supermercado;Comida;85,00;PEN\n${d};Farmacia;Comida;12,50;PEN\n`;
    await page.getByLabel("Archivo CSV").setInputFiles({ name: "gastos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText("2 válidas · 1 posibles duplicados · 0 con errores")).toBeVisible();
    await page.getByRole("button", { name: "Importar 1" }).click();
    await expect.poll(() => mutations.filter((m) => m.table === "expenses" && m.method === "POST").length).toBe(1);
    const body = mutations.find((m) => m.method === "POST")!.body as Record<string, unknown>[];
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ name: "Farmacia", amount: 12.5, currency: "PEN", amount_base: 12.5 });
  });

  test("eliminar con deshacer no borra nada", async ({ page }) => {
    const mutations: import("./mock-supabase").Mutation[] = [];
    await mockSupabase(page, CONSENT, mutations);
    await page.goto(`${BASE}/expenses/`);
    await page.getByRole("button", { name: "Eliminar" }).first().click();
    await expect(page.getByText("Supermercado")).toHaveCount(0);
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByText("Supermercado").first()).toBeVisible();
    await page.waitForTimeout(5500);
    expect(mutations.filter((m) => m.method === "DELETE")).toEqual([]);
  });
});
