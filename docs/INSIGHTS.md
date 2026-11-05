# Insights y decisiones

Formato: **tema**. Decisión. *Por qué.*

- **Hosting estático.** GitHub Pages solo sirve archivos: no hay Server Actions, middleware ni rutas
  dinámicas. *La app original (Next + NextAuth + Notion) no podía funcionar ahí.*
- **Notion → Supabase.** La API de Notion no admite CORS y su token daría acceso total a la base.
  *Supabase + RLS permite llamar a la base desde el navegador con seguridad.*
- **Rutas `?id=`** en vez de `[id]`. *`output: "export"` exige conocer las rutas al compilar.*
- **`useSearchParams` dentro de `<Suspense>`.** *Requisito del export estático de Next 16.*
- **Fechas `date` en hora local** (`lib/domain/dates.ts`). *`new Date("YYYY-MM-DD")` es UTC y en Perú
  (UTC-5) mostraba el día anterior.*
- **Frankfurter no publica PEN.** USD↔PEN usa la tasa manual de la pareja (`couples.fx_rate`); otras
  monedas se triangulan vía USD. Si la API falla se lanza error (no 1:1 silencioso).
- **Usuario A/B estable** = id menor entre los **miembros** de la pareja (no entre quienes tienen ingresos).
- **Políticas con `(select fn())`.** *Postgres evalúa la función una vez por consulta (initPlan).*
- **Helpers RLS en esquema `private`.** *El linter de Supabase marca las SECURITY DEFINER expuestas en `public`.*
- **`goals.current_amount` lo mantiene un trigger** sobre `goal_contributions`. *Evita carreras.*
- **Storage no se puede borrar con SQL** (trigger `storage.protect_delete`). Los archivos se eliminan desde
  la app con la API de Storage antes de borrar el registro. Si el admin elimina una cuenta, pueden quedar
  imágenes huérfanas (pendiente: limpieza programada).
- **Invitaciones vía Edge Function.** `inviteUserByEmail` requiere service role, que nunca debe llegar al
  navegador. Reenviar = borrar la cuenta pendiente y volver a invitar.
- **Primer admin** se creó por SQL (bcrypt con `extensions.crypt`). El trigger permite el alta sin
  invitación solo si no existe ningún admin.
- **El `GITHUB_TOKEN` no puede activar Pages** (`enablement: true` falla con “Resource not accessible”).
  Hay que elegir *Source: GitHub Actions* manualmente una vez.
- **El sandbox de Claude no tiene red hacia Supabase ni github.io.** Las pruebas reales se hacen con SQL
  (`execute_sql` + transacción revertida) y la UI con Playwright contra un Supabase simulado.
- **Clave publishable** (`sb_publishable_…`) en el workflow: es pública por diseño; RLS protege los datos.
- **Ley 29733**: consentimiento expreso registrado (`profiles.consent_version/at`), flujo transfronterizo
  informado (servidores en EE. UU.), ARCO dentro de la app (exportar/eliminar). Solo almacenamiento
  estrictamente necesario → no se requiere banner de consentimiento de cookies, solo aviso informativo.
- **Plantillas de correo de Supabase** solo se pueden editar con **SMTP propio**. Por ahora se usa el
  predefinido (en inglés, pocos envíos por hora); ver `docs/PENDIENTES.md`.
- **Leaked password protection no está en el plan Free** (verificado: org en `free` y la doc dice
  “available on the Pro Plan and above”). Alternativa gratuita: *Password requirements* en Auth → Email.
- **Constancias huérfanas**: `orphan_receipt_paths()` (solo service_role) devuelve objetos sin fila en
  `receipts` con más de 1 hora de antigüedad (para no borrar subidas en curso); la Edge Function
  `cleanup-receipts` los borra con la API de Storage. Se ejecuta al eliminar cuentas desde `/admin` o a mano.
- **Datos sensibles en Git**: quitar un dato del código no lo borra del historial. Hay que reescribir con
  `git filter-repo --replace-text` + push forzado, y pedir a GitHub Support que purgue las vistas de los PR.
- **Versionado**: SemVer en `package.json` + `CHANGELOG.md`, verificado por `scripts/check-version.mjs`
  (workflow “Versión obligatoria” en cada PR). Al fusionar, `release.yml` crea el tag `vX.Y.Z` y el Release.
  La versión se muestra en el pie de página (`NEXT_PUBLIC_APP_VERSION` desde `next.config.ts`).
- **Vistas de PR en GitHub** no se pueden reescribir: un dato sensible que llegó a un PR solo desaparece
  recreando el repo o con GitHub Support.
- **JWT ES256**: el proyecto usa claves de firma asimétricas. Las Edge Functions deben desplegarse con
  `verify_jwt = false` y validar con `auth.getUser()` (ver `supabase/config.toml`).
- **Logs de Supabase**: `query_logs` sobre `edge_logs` (estado HTTP en `log_attributes['response.status_code']`)
  es la forma rápida de detectar errores reales en producción.
- **`main` protegida** (ruleset “Proteger main”, 2026-11-05): todo entra por PR, el check `version-check` es
  obligatorio y el push forzado y el borrado están bloqueados. Para reescribir historial hay que poner la
  regla en *Disabled* antes (Settings → Rules).
- **Tags antiguos**: el `GITHUB_TOKEN` solo puede etiquetar commits cuyos workflows coincidan con los
  actuales. Para versiones pasadas: GitHub → Releases → *Draft a new release* → tag nuevo + commit destino.

- **Presupuesto del plan Free** (1 GB de Storage, 5 GB de transferencia al mes, 500 MB de BD, pausa tras 7 días
  sin actividad). Las constancias son lo que más pesa: se comprimen a ≤ 1280 px y unos 80-400 KB, caducan a
  los 12 meses (`private.expire_old_receipts`) y un job semanal de `pg_cron` borra los archivos huérfanos.
  Con unos 10 vouchers al mes por pareja, 1 GB alcanza para cientos de parejas.
- **Cron → Edge Function sin compartir secretos**: el job lee `cron_secret` de Vault y lo manda en
  `x-cron-secret`; la función lo valida con la RPC `verify_cron_secret` (solo service_role). El secreto se generó
  dentro de la BD (`gen_random_bytes`): no existe en el repo, en los secretos de la función ni en el chat.
- **Transferencia de imágenes**: los objetos se suben con `cacheControl` de 1 año (nombre UUID inmutable) y la
  galería reutiliza la misma URL firmada (TanStack Query, 12 min). Una URL nueva invalida la caché del
  navegador y vuelve a descargar.
- **Keep-alive**: `keepalive.yml` hace una consulta REST (RLS no devuelve datos) 3 veces por semana. Si
  falla con 5xx o sin respuesta, el proyecto puede estar pausado: se restaura desde el panel.
- **Clave publishable en CI**: `ci.yml` y `keepalive.yml` la usan en claro, igual que el deploy. Es pública
  por diseño.
