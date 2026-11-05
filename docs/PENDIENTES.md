# Pendientes

Lista viva de tareas acordadas que quedan abiertas. Al cerrar una, muévela a `docs/ERRORS.md` o
`docs/INSIGHTS.md` según corresponda.

| Prioridad | Tarea | Responsable |
|---|---|---|
| 🟡 Media | SMTP propio + plantillas de correo en español | Titular (panel de Supabase) |
| ⚪ Opcional | “Leaked password protection” (requiere plan Pro) | Titular, si se escala |
| ⚪ Opcional | Inscribir el banco de datos ante la ANPD | Titular |
| 🟡 Media | Marcar el check `checks` (CI) como obligatorio en el ruleset de `main` | Titular (Settings → Rules) |
| 🟡 Media | Auth → *Password requirements* (mínimo 10 caracteres + complejidad) | Titular (panel de Supabase) |
| 🔵 Propuesta | Mejoras funcionales (ver abajo): elegir cuáles implementar | Titular |
| 🔵 Propuesta | Limpieza del repositorio (ver abajo): confirmar qué se borra | Titular |

## Propuestas de mejora (v1.1.0)
Ordenadas por valor / esfuerzo. Ninguna requiere un plan de pago.

| # | Agregar | Valor | Esfuerzo | Costo en Supabase |
|---|---|---|---|---|
| 1 | **Presupuestos por categoría** con alerta al 80 % y al 100 % | Alto | Medio | Mínimo (1 tabla) |
| 2 | **Gastos recurrentes** (alquiler, servicios) que se crean solos cada periodo | Alto | Medio | Mínimo (pg_cron ya activo) |
| 3 | **PWA instalable** (manifest + service worker) con caché offline de la app | Alto | Bajo | Ahorra transferencia |
| 4 | **Exportar CSV/PDF** del mes para la pareja (en el navegador) | Medio | Bajo | Ninguno |
| 5 | **Recordatorio de liquidación** a fin de periodo (aviso en la app) | Medio | Bajo | Ninguno |
| 6 | **Resumen anual** (gráfico por mes y categoría) | Medio | Bajo | Ninguno |
| 7 | **MFA (TOTP)** para administradores | Medio | Medio | Ninguno (gratis en Auth) |
| 8 | **Pruebas E2E con Playwright** en CI contra un Supabase simulado | Medio | Medio | Ninguno |

| Quitar o simplificar | Motivo |
|---|---|
| `netlify.toml` | No se usa: el hosting es GitHub Pages |
| `PLAN-Finanzas-en-Pareja.md` | Plan inicial ya ejecutado; mover a `docs/` o borrar |
| `scripts/migrate-notion-to-supabase.ts` + `@notionhq/client`, `dotenv`, `tsx` | Si la migración desde Notion ya terminó, son dependencias muertas |
| `@playwright/test` en devDependencies | No hay pruebas E2E en el repo; quitar o usarlo (propuesta 8) |

## Ahorro del plan Free de Supabase (estado)
| Límite Free | Uso actual | Medida aplicada |
|---|---|---|
| Storage 1 GB | ~0 MB | Compresión ≤ 1280 px / ~80-400 KB, caducidad de 12 meses, limpieza semanal |
| Transferencia 5 GB/mes | Bajo | `Cache-Control` de 1 año + URLs firmadas reutilizadas (12 min) |
| BD 500 MB | 12 MB | Tablas pequeñas; sin acción |
| Pausa tras 7 días sin actividad | — | `keepalive.yml` (3 veces por semana) |

Próximos pasos si se acerca al límite: bajar la caducidad a 6 meses (`expire_old_receipts('6 months')`),
1 constancia por registro o miniaturas.

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
