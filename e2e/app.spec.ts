import { test, expect } from "./fixtures";
import { mockSupabase, U1, U2 } from "./mock-supabase";
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
    await expect(page.getByText("🍔 Comida").first()).toBeVisible();
    await expect(page.getByText(`Comparado con ${new Date().getFullYear() - 1}`)).toBeVisible();
    await expect(page.getByTestId("yoy-total")).toContainText("vs");
    expect(problems).toEqual([]);
  });

  test("categorías: presupuesto compartido y personal, y reglas de importación", async ({ page, problems }) => {
    await page.goto(`${BASE}/categories/`);
    await expect(page.getByLabel("Presupuesto de Comida")).toHaveValue("100");
    await expect(page.getByLabel("Presupuesto personal de Comida")).toHaveValue("40");
    await expect(page.getByRole("list", { name: "Reglas de categorización" })).toContainText("“farma” → 🍔 Comida");
    expect(problems).toEqual([]);
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

  test("liquidar todo registra la liquidación en una sola RPC", async ({ page }) => {
    const mutations: import("./mock-supabase").Mutation[] = [];
    await mockSupabase(page, CONSENT, mutations);
    await page.goto(`${BASE}/expenses/`);
    await page.getByRole("button", { name: "Liquidar todo" }).click();
    await page.getByRole("button", { name: "Confirmar liquidación" }).click();
    await expect.poll(() => mutations.filter((m) => m.table === "rpc/record_settlement").length).toBe(1);
    // Ana pagó 85 a medias → Luis le paga 42,50. Sin PATCH sueltos a `expenses`.
    expect(mutations.find((m) => m.table === "rpc/record_settlement")!.body).toEqual({
      p_currency: "PEN", p_from: U2, p_to: U1, p_amount: 42.5, p_expense_ids: ["e1"],
    });
    expect(mutations.filter((m) => m.table === "expenses")).toEqual([]);
  });

  test("historial de liquidaciones", async ({ page, problems }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/expenses/`);
    await page.getByRole("link", { name: "Historial de liquidaciones" }).click();
    await expect(page.getByRole("heading", { name: "Liquidaciones" })).toBeVisible();
    const list = page.getByRole("list", { name: "Historial de liquidaciones" });
    await expect(list).toContainText("Tú");
    await expect(list).toContainText("Luis");
    await expect(list).toContainText("1 gasto: Cine");
    await expect(list).toContainText(/S\/\s*20\.00/);
    expect(problems).toEqual([]);
  });

  test("ajustes: con la pareja completa no muestra el código de invitación", async ({ page }) => {
    await mockSupabase(page, CONSENT);
    await page.route("**/auth/v1/factors**", (r) => r.fulfill({ json: [] }));
    await page.goto(`${BASE}/settings/`);
    await expect(page.getByText("El código de invitación quedó desactivado")).toBeVisible();
    await expect(page.getByText("DUO-TEST0001")).toHaveCount(0);
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

  test("importar CSV: aplica las reglas de categoría", async ({ page }) => {
    await mockSupabase(page, CONSENT);
    await page.goto(`${BASE}/expenses/import/`);
    const csv = "Fecha;Descripción;Monto\n01/02/2026;Farmacia Inkafarma;12,50\n";
    await page.getByLabel("Archivo CSV").setInputFiles({ name: "gastos.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByRole("cell", { name: "Comida" })).toBeVisible();
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
