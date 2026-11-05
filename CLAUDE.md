@AGENTS.md

# DúoFinanzas — guía para agentes

App de finanzas en pareja. **Sitio 100 % estático** (Next.js 16 `output: "export"`) publicado en
**GitHub Pages**, con **Supabase** (Auth + Postgres con RLS + Storage + una Edge Function) como backend.

## Lee primero
- `docs/ARCHITECTURE.md`: arquitectura, modelo de datos, seguridad y comandos.
- `docs/INSIGHTS.md`: decisiones y aprendizajes no obvios (léelo antes de cambiar algo “raro”).
- `docs/ERRORS.md`: bitácora de errores encontrados y cómo se resolvieron.
- `docs/PENDIENTES.md`: tareas acordadas que siguen abiertas.

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
9. Antes de hacer push: `npx tsc --noEmit && npm run lint && npm test && npm run build`.
10. Responde y documenta en español.
11. **Versionado obligatorio en cada PR**: sube `version` en `package.json` (SemVer: patch = arreglos,
    minor = funcionalidades, major = incompatibles) y añade `## [X.Y.Z] - fecha` en `CHANGELOG.md`.
    El check “Versión obligatoria” bloquea el PR si falta; al fusionar se crean el tag `vX.Y.Z` y el Release.
    Comprueba en local con `npm run version:check`.

## Cómo retomar el trabajo (nueva sesión)
1. Lee `docs/PENDIENTES.md` y pregunta al usuario qué quiere priorizar.
2. Backend: proyecto Supabase **`vjglzizutcijcyexcume`** (org “Kirin Proyect”, plan Free). Para migraciones,
   Edge Functions y logs se necesita el **conector de Supabase** en la sesión.
3. Flujo: rama de trabajo → subir versión + CHANGELOG → PR → fusionar en `main` → GitHub Actions publica en Pages
   (https://mack-yilman.github.io/duofinanzas/). Verifica que el workflow quede en verde.
4. Edge Functions viven en `supabase/functions/*`; se despliegan con el conector (no hay CI para ellas).
5. Al terminar: actualiza `docs/ERRORS.md`, `docs/INSIGHTS.md` y `docs/PENDIENTES.md` en el mismo PR.
