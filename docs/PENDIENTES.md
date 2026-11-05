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

## Propuestas implementadas (v1.2.0)
Presupuestos por categoría, gastos recurrentes, PWA, exportar CSV/PDF, recordatorio de liquidación, resumen
anual, MFA (TOTP) y E2E con Playwright. Limpieza hecha: `netlify.toml`, `PLAN-Finanzas-en-Pareja.md`, script de
Notion y dependencias muertas.

## Ideas futuras (sin acordar)
| Idea | Valor | Nota |
|---|---|---|
| Notificaciones push del recordatorio de liquidación | Medio | Requiere Web Push + Edge Function con claves VAPID |
| Presupuesto por persona (gastos personales) | Medio | Extender `budgets` con `user_id` opcional |
| Adjuntar PDF de boletas electrónicas (SUNAT) | Bajo | Hoy el bucket solo acepta imágenes |

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
