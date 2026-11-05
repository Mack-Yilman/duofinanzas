import { test as base, expect } from "@playwright/test";

/**
 * - Bloquea cualquier petición externa (Supabase, Frankfurter, fuentes): pruebas herméticas.
 * - Registra errores de consola, excepciones y violaciones de CSP para fallar si aparecen.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: async ({ page }, use) => {
    const problems: string[] = [];
    await page.route(/^https?:\/\/(?!localhost)/, (route) => {
      const url = route.request().url();
      if (url.includes(".supabase.co/auth/v1/")) {
        return route.fulfill({ status: 401, contentType: "application/json", body: '{"message":"sin sesión"}' });
      }
      return route.abort();
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" && !/Failed to load resource|net::ERR_FAILED|ERR_BLOCKED/.test(t)) problems.push(`console: ${t}`);
      if (/Content Security Policy/i.test(t)) problems.push(`csp: ${t}`);
    });
    await use(problems);
  },
});

export { expect };
