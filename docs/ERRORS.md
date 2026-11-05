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

## 2026-11-05 · v1.3.0
- **ARCO** — “Descargar mis datos” omitía `budgets` y `recurring_expenses` (tablas de v1.2.0) · la exportación
  lista las tablas a mano · se añadieron; al crear una tabla nueva hay que sumarla a `exportMyData`.
- **Metas** — una meta sin `target_date` mostraba la fecha de hoy (`parseLocalDate(null)` devuelve “ahora”) ·
  `targetDate` pasa a opcional en el tipo y el mapper.
- **Gráfico** — “Evolución” agrupaba por texto de fecha local y asumía un orden descendente · serie acumulada por
  índice de día del periodo (`evolutionSeries`).

## 2026-11-05 · v1.2.0
- **CI** — los PR de Dependabot (#6, #7) no se podían fusionar · el check obligatorio `version-check` exige subir
  versión y CHANGELOG y Dependabot no lo hace · el job se omite si `github.actor == 'dependabot[bot]'` (un check
  omitido cuenta como aprobado) y sus cambios se incluyeron en v1.2.0.
- **MFA** — `getAuthenticatorAssuranceLevel()` puede lanzar con un JWT mal formado y dejaba `useMe` en error
  (todos al login) · se captura y se asume “sin MFA pendiente”; la BD igual exige AAL2 a quien la activó.
- **Seguridad** — `expenses.recurring_id` permitía enlazar una plantilla de otra pareja (las FK se validan sin
  RLS) · la política `expenses_all` comprueba que la plantilla sea de la propia pareja (migración `0009`).
- **E2E** — `@playwright/test` 1.64 no encuentra su navegador en el sandbox · variable `PW_CHROMIUM` para usar un
  Chromium instalado; en CI se instala con `npx playwright install --with-deps chromium`.

## 2026-11-05 · Auditoría v1.1.0
- **Dependencias** — `npm audit` marcaba `next@16.2.9` como crítico y `zod` como alto · versiones antiguas ·
  `next` 16.4.5 y `zod` 4.6.7. En un export estático casi todo afectaba solo al servidor, que no existe.
- **npm** — `npm install`/`npm audit fix` fallaban con `Cannot read properties of null (reading 'edgesOut')`
  (fallo de Arborist en npm 10.9) · el lockfile se regeneró con `npx npm@11 install`; `npm ci` con npm 10 funciona.
- **CI** — los PR solo validaban la versión: un error de tipos o de build se veía recién en `main` · nuevo
  `ci.yml` (tsc + lint + test + build) y `tsc` también en el deploy.
- **CSP** — `*.supabase.co` permitía conectar con cualquier proyecto de Supabase · host exacto del proyecto.
- **Clickjacking** — Pages no envía `X-Frame-Options` y `frame-ancestors` no funciona en `<meta>` · script que
  saca la app de iframes ajenos.

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

## 2026-11-05 · v1.4.0 · Auditoría de seguridad
- **Privacidad (alta)** — la pareja podía leer, editar y borrar los gastos personales del otro y ver sus
  constancias llamando a la API · `expenses_all` y `receipts_select` solo filtraban por pareja; la UI ocultaba los
  personales · políticas por operación con `(is_shared or paid_by = auth.uid())` y `receipt_target_visible()` (0012).
- **Storage** — cualquier miembro podía listar y descargar toda la carpeta `<couple_id>/` y subir sin límite ·
  la política de SELECT solo miraba la carpeta · objetos visibles solo si su fila en `receipts` es visible o si
  eres el dueño; INSERT con formato de nombre + `receipt_quota_ok()`.
- **MFA** — con MFA activa bastaba la contraseña para `delete_my_account`, `accept_terms` y editar el perfil ·
  no llamaban a `private.mfa_ok()` · añadido.
- **Invitaciones** — un miembro retirado podía volver a entrar con el código, dos uniones simultáneas podían dejar
  3 miembros y no había límite de intentos · rotación del código, `for update` y `private.join_attempts`.
  La RPC devuelve NULL en vez de lanzar error para que el intento fallido quede registrado (un `raise` revierte el insert).
- **Ingresos** — la pareja podía crear o editar ingresos con el `user_id` del otro y alterar el reparto · RLS de
  escritura solo propia; la UI oculta editar/borrar los ajenos.
- **Clickjacking** — el script que salía de iframes no funcionaba con `<iframe sandbox>` · la página nace oculta.
  Primer intento (quitar un `<style>` al cargar) dejó la app en blanco: React volvía a insertar el `<style>` al
  hidratar · se usa el atributo `data-top` en `<html>`.
- **Constancias** — un HEIC no decodificable se subía original, con EXIF/GPS · ahora se rechaza.
- **Privacidad** — la política decía “enlaces de 5 minutos” y el código usa 15 · texto corregido (versión legal nueva).
- **Invitaciones** — reenviar al mismo correo no sumaba al límite de 20/hora (actualizaba la misma fila) · se
  cuentan los envíos en `admin_audit`.
- **Advisors** — `private.join_attempts` sin clave primaria · `id` identity.

