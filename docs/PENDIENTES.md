# Pendientes

Lista viva de tareas acordadas que quedan abiertas. Al cerrar una, muévela a `docs/ERRORS.md` o
`docs/INSIGHTS.md` según corresponda.

| Prioridad | Tarea | Responsable |
|---|---|---|
| 🟡 Media | SMTP propio + plantillas de correo en español | Titular (panel de Supabase) |
| ⚪ Opcional | “Leaked password protection” (requiere plan Pro) | Titular, si se escala |
| ⚪ Opcional | Inscribir el banco de datos ante la ANPD | Titular |
| 🟡 Media | Ruleset de `main`: marcar `checks` (CI + E2E) como obligatorio | Titular (Settings → Rules) |
| 🟡 Media | Auth → *Password requirements* (mínimo 10 caracteres + complejidad) | Titular (panel de Supabase) |
| 🟢 Recomendado | Activar la verificación en dos pasos en la cuenta de administrador | Titular (Ajustes en la app) |
| 🔵 Próxima sesión | Migrar el hosting a **Cloudflare Pages** y hacer el repositorio **privado** (ver abajo) | Claude + Titular |

## Propuestas implementadas (v1.2.0)
Presupuestos por categoría, gastos recurrentes, PWA, exportar CSV/PDF, recordatorio de liquidación, resumen
anual, MFA (TOTP) y E2E con Playwright. Limpieza hecha: `netlify.toml`, `PLAN-Finanzas-en-Pareja.md`, script de
Notion y dependencias muertas.

## Implementado en v1.3.0
Comparativa con el periodo anterior, proyección de cierre, tasa de ahorro, fecha estimada de metas, gráfico de
evolución acumulado, búsqueda y filtros, editar ingresos, liquidar todo, importar CSV y deshacer al eliminar.

## Ideas futuras (sin acordar)
| Idea | Valor | Nota |
|---|---|---|
| Notificaciones push del recordatorio de liquidación | Medio | Requiere Web Push + Edge Function con claves VAPID |
| Presupuesto por persona (gastos personales) | Medio | Extender `budgets` con `user_id` opcional |
| Adjuntar PDF de boletas electrónicas (SUNAT) | Bajo | Hoy el bucket solo acepta imágenes |
| Reglas de categorización automática al importar (p. ej. “Wong” → Supermercado) | Medio | Tabla `category_rules` por pareja |
| Comparativa interanual (mismo mes del año pasado) en `/summary` | Bajo | Reutiliza `comparePeriods` |
| Historial de liquidaciones (quién pagó a quién y cuándo) | Medio | Tabla `settlements` + vínculo a los gastos |

## Ahorro del plan Free de Supabase (estado)
| Límite Free | Uso actual | Medida aplicada |
|---|---|---|
| Storage 1 GB | ~0 MB | Compresión ≤ 1280 px / ~80-400 KB, caducidad de 12 meses, limpieza semanal |
| Transferencia 5 GB/mes | Bajo | `Cache-Control` de 1 año + URLs firmadas reutilizadas (12 min) |
| BD 500 MB | 12 MB | Tablas pequeñas; sin acción |
| Pausa tras 7 días sin actividad | — | `keepalive.yml` (3 veces por semana) |

Próximos pasos si se acerca al límite: bajar la caducidad a 6 meses (`expire_old_receipts('6 months')`),
1 constancia por registro o miniaturas.

## Migrar a Cloudflare Pages + repositorio privado
**Estado:** acordado como pendiente (2026-11-05). Objetivo: que el código no sea visible (repo privado) sin perder
el hosting gratuito (GitHub Pages Free no publica repos privados).

**Pasos del titular (≈15 min):**
1. Crear cuenta gratis en Cloudflare → *Workers & Pages* → crear proyecto Pages `duofinanzas` (“Direct Upload”).
2. Crear un *API Token* con permiso **Cloudflare Pages: Edit** y copiar el *Account ID*.
3. GitHub → Settings → Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
4. Al final: Settings → General → *Change visibility* → **Private**, y desactivar GitHub Pages.

**Cambios de código (Claude, 1 PR):**
- `deploy-pages.yml` → `deploy-cloudflare.yml`: mismo build + tests y `wrangler pages deploy out` (acción
  `cloudflare/wrangler-action`). Se mantienen CI, E2E, release, keep-alive y Dependabot.
- `NEXT_PUBLIC_BASE_PATH` vacío (la app pasa a `https://duofinanzas.pages.dev/`, en la raíz); ajustar CI y `e2e/serve.mjs`.
- **Cabeceras HTTP reales** con `public/_headers` (Pages no las permitía): CSP con `frame-ancestors 'none'`, HSTS,
  `X-Content-Type-Options`, `Permissions-Policy` y caché inmutable de `/_next/static/`. Se puede quitar el script
  anti-clickjacking.
- Supabase: Auth → URL Configuration (Site URL + Redirect URLs al dominio nuevo) y `ALLOWED_ORIGINS`/`redirectTo`
  en las Edge Functions `admin-invite` y `cleanup-receipts` (redesplegarlas).
- Legal: `LEGAL.hosting.web` = Cloudflare (EE. UU.) → subir `LEGAL.version` (se vuelve a pedir el consentimiento).

**Efectos a tener en cuenta:**
- ⚠️ En GitHub Free, los **rulesets de repos privados no se aplican**: `main` quedaría sin protección (se puede seguir
  el mismo flujo por disciplina, o pagar GitHub Pro). Actions privado: 2 000 min/mes gratis (sobra para este uso).
- Cambia la URL: hay que volver a iniciar sesión e instalar la PWA desde el dominio nuevo. Opcional: dominio propio
  (p. ej. `duofinanzas.pe`, de pago) y un repo público mínimo que redirija la URL antigua de github.io.
- Cloudflare Pages Free: ancho de banda ilimitado y 500 despliegues al mes.

## SMTP propio + plantillas en español
**Estado:** pospuesto (2026-11-04). Se usa el correo **predefinido** de Supabase: en inglés y con
pocos envíos por hora. Supabase exige SMTP propio para editar las plantillas.

Pasos (Gmail, gratis, ~500 correos/día):
1. Google → activar **Verificación en 2 pasos** → https://myaccount.google.com/apppasswords → crear
   “DuoFinanzas Supabase” y copiar la clave de 16 letras.
2. Supabase → Authentication → **SMTP Settings** → *Enable Custom SMTP*:
   host `smtp.gmail.com`, puerto `465`, usuario y remitente `mack.yilman@gmail.com`, nombre `DúoFinanzas`,
   contraseña = clave de aplicación.
3. Authentication → **Rate Limits** → envío de correos: 30/hora.
4. Authentication → **Email Templates** → “Invite user” y “Reset Password” en español
   (conservar siempre `{{ .ConfirmationURL }}`).

## Leaked password protection
No disponible en el plan Free (verificado el 2026-11-04). Mientras tanto se puede activar
*Password requirements* (dígitos, mayúsculas, minúsculas y símbolos) en Auth → Email.

## Inscripción ante la ANPD
Opcional mientras el uso sea exclusivamente personal o familiar (excepción del art. 3 de la Ley 29733).
Hacerlo si la app se abre a más personas.
