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
