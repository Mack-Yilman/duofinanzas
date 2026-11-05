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
- **Dependabot y versionado**: sus PR no suben versión (no editan `package.json` version ni CHANGELOG); se les
  omite el check y los cambios salen en la siguiente versión. Al fusionar no se crea tag (la versión no cambió).
- **Gastos recurrentes sin servidor**: los crea el navegador al abrir la app (`lib/recurring-runner.ts`), con
  `computeExpenseFields` (mismo cálculo que un gasto manual, incluido el tipo de cambio EUR de Frankfurter, que
  pg_cron no puede consultar). Índice único `(recurring_id, date)` + avance condicional de `next_date` = idempotente.
- **MFA en la base de datos, no en la UI**: `private.mfa_ok()` (AAL2 o sin factor verificado) está dentro de
  `private.my_couple_id()` y `private.is_admin()`. Todas las políticas de pareja y las RPC/Edge Functions de admin
  quedan protegidas con un solo cambio. Quien no activa MFA no nota nada.
- **Service worker**: solo cachea el HTML estático y `/_next/static` del mismo origen; nunca respuestas de Supabase.
  Se registra con `?v=<versión>`: cada despliegue crea una caché nueva y borra la anterior.
- **Exportar a PDF** usa `window.print()` + `print:` de Tailwind (sin librerías). El layout quita `h-screen` y
  `overflow` al imprimir; si no, solo se imprimiría la parte visible.
- **E2E con Supabase simulado**: `e2e/mock-supabase.ts` inyecta una sesión falsa en localStorage (supabase-js no
  verifica la firma en el navegador) y responde `/rest/v1`. La seguridad real se prueba con SQL en transacciones
  revertidas, no con E2E.
- **Estadísticas en PEN** (`amountBase`) sobre los gastos visibles para quien mira (compartidos + personales
  propios). La tasa de ahorro “de la pareja” usa solo gastos compartidos: los personales del otro no son visibles.
- **Proyección lineal** (ritmo diario × días del periodo): con menos de 7 días se marca como preliminar.
- **Deshacer sin servidor**: `deferDelete` oculta el elemento en la caché de TanStack Query y borra tras 5 s;
  si se cierra la app antes, no se borra nada (falla hacia lo seguro). Por eso esos borrados no usan `action()`,
  que invalida la caché al terminar y “resucitaría” el elemento.
- **Liquidar todo** asocia la constancia al gasto pendiente más reciente: el modelo exige `expense_id` por constancia.
- **Importar CSV**: mismo `computeExpenseFields` que un gasto manual; duplicado = fecha + monto + descripción
  normalizada; los personales se asignan a quien importa (no se pueden crear personales de la pareja).
- **Filtros en la URL** (`?q=&cat=&who=&status=`): se pueden compartir/guardar y el selector de periodo los conserva.
- **Licencia**: repositorio público + `LICENSE` propietaria = “código visible, no abierto”. Los Términos de GitHub
  obligan a permitir ver y hacer fork dentro de GitHub; la licencia lo reconoce y prohíbe todo lo demás. Para una
  protección mayor, el repositorio puede pasar a **privado**: Pages sigue publicando desde Actions en cuentas
  con GitHub Pro, pero en el plan Free un repo privado **no** puede usar Pages.
- **Privacidad en la BD, no en la UI** (v1.4.0): todo lo “personal” (gastos, sus constancias, presupuestos
  personales, recurrentes) se filtra con RLS. Las funciones `private.receipt_target_visible/receipt_path_visible`
  son SECURITY DEFINER para que las políticas de `storage.objects` y `receipts` no dependan de la RLS de otra
  tabla ni recursen sobre sí mismas.
- **`record_settlement` es SECURITY INVOKER**: inserta el historial y marca los gastos en una transacción con los
  permisos de quien llama (RLS aplica igual). El monto lo calcula el cliente con `buildSettlements` (misma lógica
  testeada que el saldo); la BD valida que los gastos sean compartidos, pendientes, de la pareja y de esa moneda.
  Una fila por moneda; las liquidaciones previas a v1.4.0 no tienen historial.
- **Presupuestos**: compartido (`user_id` NULL) = gastos compartidos; personal = mis gastos personales. Índice
  `unique nulls not distinct (couple_id, category_id, user_id)` (PG 15+) para que el upsert funcione con NULL.
- **Reglas de categoría**: coincidencia por texto contenido sin tildes ni mayúsculas; gana el patrón más largo.
  La columna Categoría del CSV tiene prioridad sobre las reglas.
- **PDF**: no se comprimen; se verifica la firma `%PDF-` (el tipo MIME lo declara el navegador). La CSP
  (`frame-src`/`object-src 'none'`) impide incrustarlos: se abren en otra pestaña con la URL firmada, que vive en el
  dominio de Supabase (otro origen: un PDF malicioso no accede a la sesión de la app).
- **`join_couple` devuelve NULL** si el código no sirve: un `raise exception` revierte la transacción y borraría el
  registro del intento fallido, así que no habría límite de intentos.
- **Anti-clickjacking sin cabeceras**: `<style>html:not([data-top]){display:none}</style>` + script que pone
  `data-top` solo si `self === top`. Quitar el `<style>` no sirve: React lo vuelve a insertar al hidratar.

