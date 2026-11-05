import { test, expect } from "./fixtures";

const BASE = "/duofinanzas";

test.describe("páginas públicas", () => {
  test("login se muestra sin errores ni violaciones de CSP", async ({ page, problems }) => {
    await page.goto(`${BASE}/login/`);
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("sin sesión, una página privada redirige al login", async ({ page }) => {
    await page.goto(`${BASE}/expenses/`);
    await expect(page).toHaveURL(/\/duofinanzas\/login\/?$/);
  });

  test("políticas legales con la retención de constancias", async ({ page, problems }) => {
    await page.goto(`${BASE}/privacidad/`);
    await expect(page.getByRole("heading", { name: /Política de Privacidad/ })).toBeVisible();
    await expect(page.getByText(/12\s+meses/)).toBeVisible();
    await page.goto(`${BASE}/terminos/`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("anti-clickjacking: dentro de un <iframe sandbox> la app no se muestra", async ({ page }) => {
    await page.goto(`${BASE}/login/`);
    await expect(page.locator("html")).toHaveAttribute("data-top", "");
    // Un iframe con sandbox sin `allow-top-navigation` no puede redirigir: la página debe quedar oculta.
    await page.setContent(`<iframe sandbox="allow-scripts allow-same-origin" src="${page.url()}" width="800" height="600"></iframe>`);
    const frame = page.frameLocator("iframe");
    await expect(frame.locator("html")).toBeAttached();
    await expect(frame.locator("html")).not.toHaveAttribute("data-top", /.*/);
    await expect(frame.getByRole("button", { name: "Iniciar sesión" })).toBeHidden();
  });

  test("la CSP solo permite el proyecto de Supabase", async ({ page }) => {
    await page.goto(`${BASE}/login/`);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(csp).toContain("connect-src 'self' https://");
    expect(csp).not.toContain("*.supabase.co");
    expect(csp).toContain("frame-src 'none'");
  });
});

test.describe("PWA", () => {
  test("manifest válido con iconos accesibles", async ({ page, request }) => {
    await page.goto(`${BASE}/login/`);
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBe(`${BASE}/manifest.webmanifest`);
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: `${BASE}/`, scope: `${BASE}/` });
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
    }
  });

  test("el service worker se registra y la app abre sin conexión", async ({ page, context }) => {
    await page.goto(`${BASE}/login/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // ya controlada por el SW: se guarda en caché
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    await context.setOffline(false);
  });
});
