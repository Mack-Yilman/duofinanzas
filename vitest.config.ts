import { defineConfig } from "vitest/config";

// Pruebas unitarias (lógica pura). Las E2E de Playwright viven en e2e/ y se ejecutan con `npm run e2e`.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.{ts,mjs}"],
    exclude: ["e2e/**", "node_modules/**", "out/**", ".next/**"],
  },
});
