# Arquitectura

## Visión general
```
Navegador (GitHub Pages: HTML/JS estático, basePath /duofinanzas)
 ├─ supabase-js (clave publishable) ──► Supabase Auth   (email + contraseña, solo por invitación)
 ├─────────────────────────────────────► Postgres + RLS (aislamiento por pareja)
 ├─────────────────────────────────────► Storage        (bucket privado `receipts`, URLs firmadas 15 min)
 ├─ functions.invoke('admin-invite') ──► Edge Function  (service role; solo administradores)
 ├─ functions.invoke('cleanup-receipts') ► Edge Function (borra constancias huérfanas; admins o cron)
 └─ fetch ─────────────────────────────► api.frankfurter.dev (tipos de cambio, sin datos personales)
```

Mantenimiento automático:
```
pg_cron (domingos 08:17 UTC) ─► private.run_receipts_maintenance()
 ├─ expire_old_receipts()  (borra filas de constancias con más de 12 meses)
 └─ net.http_post ─► cleanup-receipts (x-cron-secret de Vault) ─► borra los archivos huérfanos del Storage
```

CI/CD:

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | PR a `main` | tsc + lint + tests + build + E2E (Playwright) |
| `pr-version-check.yml` | PR a `main` | Exige subir versión + CHANGELOG (se omite en PR de Dependabot) |
| `deploy-pages.yml` | push a `main` | tsc + lint + tests + build + deploy a Pages |
| `release.yml` | push a `main` | Crea el tag `vX.Y.Z` y el Release |
| `keepalive.yml` | 3 veces por semana | Ping REST para que el plan Free no pause el proyecto |
| `dependabot.yml` | mensual | PR agrupados de npm y Actions |

## Carpetas
| Ruta | Rol |
|---|---|
| `app/` | Páginas (componentes cliente). `(app)/` requiere sesión + pareja; `admin/`, `setup/`, `accept-invite/`, `reset-password/`, `login/` y las legales están fuera. |
| `components/` | UI. `ui/` = primitivas shadcn/Base UI. |
| `lib/repos/` | Acceso a datos (Supabase). Mapeo snake_case → camelCase en `mappers.ts`. |
| `lib/actions/` | Mutaciones de formularios en el cliente (`action()` = toast + invalidar caché). |
| `lib/domain/` | Lógica pura testeada: reparto (`split.ts`), periodos, FX, fechas, dashboard, presupuestos, recurrentes, estadísticas (`stats.ts`), filtros, exportación/importación CSV, resumen anual. |
| `lib/undo.ts` | Borrado diferido con “Deshacer” (oculta en caché y borra a los 5 s). |
| `lib/recurring-runner.ts` | Registra los gastos recurrentes vencidos al abrir la app (idempotente). |
| `lib/mfa.ts` | Verificación en dos pasos (TOTP): activar, verificar al entrar, desactivar. |
| `public/sw.js` + `app/manifest.ts` | PWA: service worker (solo estáticos del mismo origen) y manifest. |
| `e2e/` | Pruebas Playwright contra `out/` con Supabase simulado (`npm run e2e`). |
| `lib/couple-data.ts` | Carga paralela de todo lo de la pareja (9 consultas) con TanStack Query. |
| `lib/legal.ts` | Datos del titular y versión de las políticas (Ley 29733). |
| `supabase/migrations/` | Esquema versionado (aplicar en orden). |
| `supabase/functions/admin-invite/` | Edge Function de invitaciones (Deno). |
| `supabase/functions/cleanup-receipts/` | Edge Function que borra del Storage las constancias sin registro. |
| `supabase/config.toml` | Config de la CLI: `verify_jwt = false` en las funciones (JWT ES256). |

## Flujo de datos
`useMe()` (perfil + is_admin + consentimiento) → `useCoupleData(coupleId)` → `computeDashboard()` (puro)
→ páginas. Las mutaciones (`lib/actions/*`) invalidan la caché de TanStack Query.

## Modelo de datos (public)
| Tabla | Notas |
|---|---|
| `couples` | `invite_code` (DUO-XXXXXXXX), `fx_rate` USD→PEN, `cutoff_day`. Alta solo vía `create_couple`. |
| `profiles` | 1:1 con `auth.users`; `couple_id`, `role`, `consent_version/at`. Editable solo `name`, `avatar_color`. |
| `categories`, `incomes`, `expenses`, `goals`, `goal_contributions` | Todas con `couple_id` (default `private.my_couple_id()`). |
| `budgets` | Presupuesto por categoría y periodo (PEN); único por `(couple_id, category_id)`. |
| `recurring_expenses` | Plantillas mensuales (día 1-28, `next_date`). Las personales solo las ve quien paga. `expenses.recurring_id` + índice único `(recurring_id, date)`. |
| `receipts` | Constancias: `kind` = expense / settlement / goal_contribution; `path` = `<couple_id>/<uuid>.<ext>`; máx. 5 por registro. |
| `invitations` | Correos invitados. Sin políticas: solo la Edge Function (service role) y RPCs. |
| `app_admins`, `admin_audit` | Administradores y auditoría. Sin políticas: solo vía RPC. |

## Seguridad (capas)
1. **Acceso por invitación**: trigger `BEFORE INSERT` en `auth.users` (`private.enforce_invite_only`)
   rechaza altas sin invitación vigente, aunque el registro público siga activo.
2. **RLS** en todas las tablas; helpers en el esquema `private` (no expuesto por la API).
3. **RPCs admin** (`admin_*`) verifican `admin_assert()` y escriben en `admin_audit`. El admin no ve finanzas.
4. **Storage**: bucket privado, 5 MB, solo imágenes; políticas por carpeta `<couple_id>/`.
   La app re-codifica a WebP/JPEG ≤ 1280 px (quita EXIF/GPS). Caducidad a los 12 meses + limpieza semanal.
5. **CSP** por `<meta>` (Pages no permite cabeceras): `connect-src` solo el host del proyecto Supabase y
   Frankfurter; script anti-clickjacking (sale de iframes ajenos).
6. **Edge Function** `admin-invite`: CORS solo para el sitio y localhost, verifica JWT + rol admin,
   límite de 20 invitaciones/hora, `redirectTo` calculado en el servidor (no lo controla el cliente).

## Rutas de la app
`/` dashboard (estadísticas, presupuestos, recordatorio, evolución) · `/expenses` (filtros `?q=&cat=&who=&status=`,
CSV/PDF, liquidar todo) · `/expenses/import` · `/recurring` · `/summary?year=` · `/income` (+ `/income/edit?id=`) ·
`/goals` (fecha estimada) · `/categories` (presupuestos) · `/settings` (MFA) · `/admin`.

## MFA
`private.mfa_ok()` = sesión AAL2 **o** sin factor TOTP verificado. Está dentro de `private.my_couple_id()` y
`private.is_admin()`: con MFA activa y solo contraseña, RLS no devuelve datos y las RPC de admin fallan.

## RPCs
- Usuario: `create_couple`, `join_couple`, `is_admin`, `accept_terms`, `delete_my_account`.
- Admin: `admin_list_users`, `admin_stats`, `admin_set_banned`, `admin_remove_from_couple`,
  `admin_set_admin`, `admin_delete_user`, `admin_audit_log`, `admin_list_invitations`, `admin_revoke_invitation`.
- Solo service_role: `prepare_invitation`, `cancel_invitation`, `orphan_receipt_paths`, `log_system_action`,
  `verify_cron_secret`.
- Internas (`private`, sin acceso por API): `expire_old_receipts`, `run_receipts_maintenance`.

## Comandos
```bash
npm run dev            # http://localhost:3000 (con .env.local)
npm test               # vitest (lógica de dominio)
npm run lint
npm run build          # genera out/
npm run e2e            # Playwright contra out/ (build con NEXT_PUBLIC_BASE_PATH=/duofinanzas)
```
