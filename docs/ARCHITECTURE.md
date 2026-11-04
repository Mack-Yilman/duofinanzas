# Arquitectura

## Visión general
```
Navegador (GitHub Pages: HTML/JS estático, basePath /duofinanzas)
 ├─ supabase-js (clave publishable) ──► Supabase Auth   (email + contraseña, solo por invitación)
 ├─────────────────────────────────────► Postgres + RLS (aislamiento por pareja)
 ├─────────────────────────────────────► Storage        (bucket privado `receipts`, URLs firmadas 5 min)
 ├─ functions.invoke('admin-invite') ──► Edge Function  (service role; solo administradores)
 └─ fetch ─────────────────────────────► api.frankfurter.dev (tipos de cambio, sin datos personales)
```
Despliegue: push a `main` → `.github/workflows/deploy-pages.yml` (lint + tests + build + deploy).

## Carpetas
| Ruta | Rol |
|---|---|
| `app/` | Páginas (componentes cliente). `(app)/` requiere sesión + pareja; `admin/`, `setup/`, `accept-invite/`, `reset-password/`, `login/` y las legales están fuera. |
| `components/` | UI. `ui/` = primitivas shadcn/Base UI. |
| `lib/repos/` | Acceso a datos (Supabase). Mapeo snake_case → camelCase en `mappers.ts`. |
| `lib/actions/` | Mutaciones de formularios en el cliente (`action()` = toast + invalidar caché). |
| `lib/domain/` | Lógica pura testeada: reparto (`split.ts`), periodos, FX, fechas, dashboard. |
| `lib/couple-data.ts` | Carga paralela de todo lo de la pareja (7 consultas) con TanStack Query. |
| `lib/legal.ts` | Datos del titular y versión de las políticas (Ley 29733). |
| `supabase/migrations/` | Esquema versionado (aplicar en orden). |
| `supabase/functions/admin-invite/` | Edge Function de invitaciones (Deno). |

## Flujo de datos
`useMe()` (perfil + is_admin + consentimiento) → `useCoupleData(coupleId)` → `computeDashboard()` (puro)
→ páginas. Las mutaciones (`lib/actions/*`) invalidan la caché de TanStack Query.

## Modelo de datos (public)
| Tabla | Notas |
|---|---|
| `couples` | `invite_code` (DUO-XXXXXXXX), `fx_rate` USD→PEN, `cutoff_day`. Alta solo vía `create_couple`. |
| `profiles` | 1:1 con `auth.users`; `couple_id`, `role`, `consent_version/at`. Editable solo `name`, `avatar_color`. |
| `categories`, `incomes`, `expenses`, `goals`, `goal_contributions` | Todas con `couple_id` (default `private.my_couple_id()`). |
| `receipts` | Constancias: `kind` = expense / settlement / goal_contribution; `path` = `<couple_id>/<uuid>.<ext>`; máx. 5 por registro. |
| `invitations` | Correos invitados. Sin políticas: solo la Edge Function (service role) y RPCs. |
| `app_admins`, `admin_audit` | Administradores y auditoría. Sin políticas: solo vía RPC. |

## Seguridad (capas)
1. **Acceso por invitación**: trigger `BEFORE INSERT` en `auth.users` (`private.enforce_invite_only`)
   rechaza altas sin invitación vigente, aunque el registro público siga activo.
2. **RLS** en todas las tablas; helpers en el esquema `private` (no expuesto por la API).
3. **RPCs admin** (`admin_*`) verifican `admin_assert()` y escriben en `admin_audit`. El admin no ve finanzas.
4. **Storage**: bucket privado, 5 MB, solo imágenes; políticas por carpeta `<couple_id>/`.
   La app re-codifica a WebP (quita EXIF/GPS).
5. **CSP** por `<meta>` (Pages no permite cabeceras): `connect-src` solo Supabase y Frankfurter.
6. **Edge Function** `admin-invite`: CORS solo para el sitio y localhost, verifica JWT + rol admin,
   límite de 20 invitaciones/hora, `redirectTo` calculado en el servidor (no lo controla el cliente).

## RPCs
- Usuario: `create_couple`, `join_couple`, `is_admin`, `accept_terms`, `delete_my_account`.
- Admin: `admin_list_users`, `admin_stats`, `admin_set_banned`, `admin_remove_from_couple`,
  `admin_set_admin`, `admin_delete_user`, `admin_audit_log`, `admin_list_invitations`, `admin_revoke_invitation`.
- Solo service_role: `prepare_invitation`.

## Comandos
```bash
npm run dev            # http://localhost:3000 (con .env.local)
npm test               # vitest (lógica de dominio)
npm run lint
npm run build          # genera out/
```
