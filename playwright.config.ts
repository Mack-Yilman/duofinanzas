import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra el build estático (out/), igual que en GitHub Pages. Supabase se simula:
 * los tests nunca salen a internet (ver e2e/fixtures.ts).
 * Requisito: `npm run build` con NEXT_PUBLIC_BASE_PATH=/duofinanzas.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    // Opcional: usar un Chromium ya instalado (PW_CHROMIUM=/ruta/chromium) en vez del de Playwright.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "node e2e/serve.mjs", url: "http://localhost:4173/duofinanzas/", reuseExistingServer: !process.env.CI },
});
