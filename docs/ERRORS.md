# Bitácora de errores

Formato: **fecha · área** — síntoma · causa · solución.

## 2026-11-04 · Auditoría inicial (migración Notion → Supabase)
- **Seguridad** — se veían gastos, ingresos y aportes de otras parejas · `getExpenses/getIncomes` ignoraban
  `coupleId` · RLS por pareja en todas las tablas.
- **Seguridad** — se podía borrar/editar gastos ajenos (IDOR) · acciones sin verificación de pertenencia · RLS.
- **Cálculo** — editar un gasto en USD guardaba `amountBase = amount` y no recalculaba el reparto ·
  `buildExpense()` compartido por crear/editar.
- **Cálculo** — FX caía a 1:1 en silencio (y PEN↔USD siempre 1:1) · Frankfurter no tiene PEN · tasa de la pareja + error visible.
- **Cálculo** — ingresos en USD contados como PEN; A/B inestable si un miembro no tenía ingresos · `calculateEquity(..., memberIds)`.
- **Fechas** — desfase de un día · parseo UTC · `parseLocalDate/toDateString`.
- **UI** — avatar sin color · clase Tailwind dinámica `bg-${c}-500` · mapa estático `lib/avatar.ts`.
- **UI** — tipo de ingreso “investment” inválido; `goals.sort()` mutaba la lista; botones dentro de enlaces.
- **CI** — `npm ci` fallaba · `package-lock.json` desincronizado · regenerado.

## 2026-11-04 · Despliegue
- **Pages** — workflow falló con `Get Pages site failed ... Not Found` · Pages no estaba activado y el
  `GITHUB_TOKEN` no puede activarlo · el usuario eligió *Source: GitHub Actions*.
- **Git** — cambios del admin no llegaron a `main` · el PR #1 se fusionó antes del último commit · PR #2.
- **Supabase** — `apply_migration` agotó el tiempo · el servidor pidió confirmación interactiva (revokes) y nadie respondió · reintento con confirmación.
- **Advisors** — helpers SECURITY DEFINER invocables vía `/rest/v1/rpc` · movidos a esquema `private`.

## 2026-11-04 · Invitaciones, constancias y cumplimiento legal
- **Seguridad** — cualquiera podía registrarse en `/register` · registro abierto · eliminado `/register`,
  trigger `enforce_invite_only` y Edge Function `admin-invite` (solo admins).
- **Storage** — no se pueden borrar objetos con SQL (`protect_delete`) · borrado desde la app vía API.
- **Legal** — faltaban políticas y consentimiento (Ley 29733) · `/privacidad`, `/terminos`, `/cookies`,
  consentimiento registrado y derechos ARCO en Ajustes.

## 2026-11-04 · Auditoría de seguridad (skill `security-review`)
Resultado: **sin vulnerabilidades explotables con confianza ≥ 8/10**. Se endurecieron los casos límite reportados:
- **Pre-registro** (3/10): si `inviteUserByEmail` fallaba, la invitación quedaba vigente y, con el registro
  público activo, alguien que conociera el correo podía crearse la cuenta · la Edge Function ahora revoca la
  invitación (`cancel_invitation`) si el correo no sale. Además: desactivar *Allow new users to sign up*.
- **Último administrador** (carrera teórica): dos admins eliminándose a la vez podían dejar `app_admins` vacía y
  reabrir el registro · `lock table app_admins` en `delete_my_account` y `admin_set_admin`, que ahora exige ≥ 1 admin.
- **Advisors**: quedan como WARN solo las RPC intencionalmente invocables (cada una valida `auth.uid()` o
  `admin_assert()`), y “Leaked password protection” (ajuste del panel de Auth).

## 2026-11-04 · Datos personales y almacenamiento
- **Privacidad** — el DNI del titular quedó en el historial público de Git (PR #4) aunque luego se quitó
  de la web (PR #5) · borrar un dato del código no lo elimina del historial · reescritura con
  `git filter-repo --replace-text` + push forzado; purga de las vistas de los PR pendiente con GitHub Support.
- **Storage** — imágenes huérfanas al eliminar cuentas o parejas · el borrado en cascada de SQL no alcanza
  a Storage · Edge Function `cleanup-receipts` + RPC `orphan_receipt_paths`.

## 2026-11-05 · Repositorio recreado
- **Privacidad** — tras reescribir el historial, el DNI seguía visible en las páginas de los PR #4 y #5
  (`refs/pull/*` son inmutables) y por SHA directo · GitHub conserva las referencias de los PR · el titular
  borró y recreó el repositorio, y se subió el historial ya limpio. Se perdieron los PR #1–#7 y el historial
  de Actions (el código y los docs se conservan).
- **CI** — el primer “Tag y Release” falló con `fatal: empty ident name` · `git tag -a` requiere
  `user.name/email` en el runner · el tag se crea con `gh release create --target <sha>` (v1.0.1).

## 2026-11-05 · Revisión de Supabase y CI
- **Edge Functions** — riesgo de 401 al invitar o limpiar: el proyecto firma los JWT con ES256 y la opción
  *Verify JWT* de la plataforma no es compatible con claves asimétricas · `verify_jwt = false` en ambas
  funciones (validan al usuario por dentro) + `supabase/config.toml` (v1.0.2).
- **CI** — avisos “Node.js 20 is deprecated” · acciones antiguas · actualizadas a versiones con Node 24.
- **CI** — `workflow_dispatch` de “Tag y Release” lanzado desde la integración devolvió 403 al crear el
  Release · el token de la integración no tiene ese permiso · lanzarlo manualmente desde la pestaña Actions.
- **CI** — crear el tag `v1.0.0` desde “Run workflow” falló con `HTTP 403: Resource not accessible by
  integration` (también lanzado por el titular) · el `GITHUB_TOKEN` no puede crear refs sobre commits cuyos
  workflows difieren de los actuales · se quita la entrada `ref` (v1.0.4); tags antiguos desde la interfaz.

