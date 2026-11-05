@AGENTS.md

# DúoFinanzas — guía para agentes

App de finanzas en pareja. **Sitio 100 % estático** (Next.js 16 `output: "export"`) publicado en
**GitHub Pages**, con **Supabase** (Auth + Postgres con RLS + Storage + una Edge Function) como backend.

## Lee primero
- `docs/ARCHITECTURE.md`: arquitectura, modelo de datos, seguridad y comandos.
- `docs/INSIGHTS.md`: decisiones y aprendizajes no obvios (léelo antes de cambiar algo “raro”).
- `docs/ERRORS.md`: bitácora de errores encontrados y cómo se resolvieron.
- `docs/PENDIENTES.md`: tareas acordadas que siguen abiertas y propuestas de mejora.
- `docs/SECURITY-AUDIT.md`: última auditoría de seguridad (actualízala si cambias RLS, Storage o Edge Functions).

## Mapa rápido del código
| Dónde | Qué |
|---|---|
| `lib/domain/*.ts` | Lógica pura **con tests** (`*.test.ts`): `split` (reparto), `period`, `fx`, `dashboard`, `budgets`, `recurring`, `stats` (comparativa, proyección, ahorro, ETA de metas, evolución), `filters`, `export`/`import` (CSV), `annual`. |
| `lib/repos/*.ts` | Acceso a Supabase (snake_case ↔ camelCase en `mappers.ts`). |
| `lib/actions/*.ts` | Mutaciones de formularios. `action()` = toast + invalidar caché; los borrados usan `deferDelete` (`lib/undo.ts`, “Deshacer” 5 s). |
| `lib/couple-data.ts` | Todo lo de la pareja en 9 consultas paralelas (TanStack Query); `computeDashboard` lo procesa en memoria. |
| `app/(app)/*` | Rutas con sesión: `/`, `/expenses` (filtros `?q=&cat=&who=&status=`, CSV/PDF, liquidar todo), `/expenses/import`, `/recurring`, `/income` (+ `/income/edit?id=`), `/goals`, `/summary`, `/categories`, `/settings`. |
| `e2e/` | Playwright contra `out/` con Supabase simulado (`mock-supabase.ts` registra las escrituras para comprobarlas). |

Convenciones: lógica nueva → función pura en `lib/domain` + test; UI visible nueva → E2E en `e2e/app.spec.ts`;
montos de estadísticas en PEN (`amountBase`); gastos visibles = compartidos + personales propios.

## Reglas del proyecto
1. **Cada bug o hallazgo nuevo se registra** en `docs/ERRORS.md` (síntoma · causa · solución) y cada
   decisión o aprendizaje no obvio en `docs/INSIGHTS.md`, en el mismo PR que lo corrige. Lo que el
   usuario decida posponer va a `docs/PENDIENTES.md`.
2. **No hay servidor**: nada de Server Actions, route handlers dinámicos, middleware ni `cookies()`.
   Toda la lógica corre en el navegador; la seguridad vive en **RLS de Postgres**, nunca en la UI.
3. **Rutas dinámicas prohibidas** en export estático: usa `?id=` (`/expenses/edit?id=…`).
4. **Toda tabla nueva** necesita: RLS activado, `revoke all … from anon, authenticated`, GRANT mínimo y
   políticas con `(select private.my_couple_id())`. Helpers de políticas van en el esquema `private`.
5. **Funciones SECURITY DEFINER**: `set search_path = ''`, nombres calificados, `revoke execute … from public, anon`.
6. **Migraciones**: archivo numerado en `supabase/migrations/` + aplicarlo al proyecto
   `vjglzizutcijcyexcume`. Después, revisar `get_advisors` (security y performance).
7. **Secretos**: la service role key solo existe en la Edge Function. La URL y la clave *publishable*
   de Supabase son públicas por diseño (van en el JS).
8. Datos personales → respeta `lib/legal.ts` (Ley N.º 29733). Si cambias las políticas, sube `LEGAL.version`.
9. Antes de hacer push: `npx tsc --noEmit && npm run lint && npm test && npm run build && npm run e2e`
   (el build con `NEXT_PUBLIC_BASE_PATH=/duofinanzas`; en el sandbox usa `PW_CHROMIUM=/opt/pw-browsers/chromium`).
10. Responde y documenta en español.
11. **Versionado obligatorio en cada PR**: sube `version` en `package.json` (SemVer: patch = arreglos,
    minor = funcionalidades, major = incompatibles) y añade `## [X.Y.Z] - fecha` en `CHANGELOG.md`.
    El check “Versión obligatoria” bloquea el PR si falta (excepto los PR de Dependabot); al fusionar se crean el tag
   `vX.Y.Z` y el Release.
    Comprueba en local con `npm run version:check`.

## Cómo retomar el trabajo (nueva sesión)
1. Lee `docs/PENDIENTES.md` y pregunta al usuario qué quiere priorizar.
2. Backend: proyecto Supabase **`vjglzizutcijcyexcume`** (org “Kirin Proyect”, plan Free). Para migraciones,
   Edge Functions y logs se necesita el **conector de Supabase** en la sesión.
3. Flujo: rama de trabajo → subir versión + CHANGELOG → PR → fusionar en `main` → GitHub Actions publica en Pages.
   `main` está protegida: no se puede subir directo ni forzar; el PR solo se fusiona con `version-check` en verde
   (https://mack-yilman.github.io/duofinanzas/). Verifica que el workflow quede en verde.
4. Edge Functions viven en `supabase/functions/*`; se despliegan con el conector (no hay CI para ellas).
5. Al terminar: actualiza `docs/ERRORS.md`, `docs/INSIGHTS.md` y `docs/PENDIENTES.md` en el mismo PR.
