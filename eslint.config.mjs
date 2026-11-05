import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Playwright: el parámetro `use` de los fixtures no es un hook de React.
  { files: ["e2e/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Edge Functions de Supabase (Deno): se validan en su propio runtime.
    "supabase/functions/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
