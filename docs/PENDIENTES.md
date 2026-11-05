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
| 🟡 Media | Auth → *Secure password change* (pedir sesión reciente/AAL2 para cambiar la contraseña) | Titular (panel de Supabase) |
| 🟢 Recomendado | Mínimo de contraseña en Auth = 10 (la app ya lo exige desde v1.4.0) | Titular (panel de Supabase) |

## Propuestas implementadas (v1.2.0)
Presupuestos por categoría, gastos recurrentes, PWA, exportar CSV/PDF, recordatorio de liquidación, resumen
anual, MFA (TOTP) y E2E con Playwright. Limpieza hecha: `netlify.toml`, `PLAN-Finanzas-en-Pareja.md`, script de
Notion y dependencias muertas.

## Implementado en v1.3.0
Comparativa con el periodo anterior, proyección de cierre, tasa de ahorro, fecha estimada de metas, gráfico de
evolución acumulado, búsqueda y filtros, editar ingresos, liquidar todo, importar CSV y deshacer al eliminar.

## Implementado en v1.4.0
Historial de liquidaciones (`/settlements`), reglas de categorización al importar, presupuesto personal,
comparativa interanual en `/summary`, PDF de boletas y una segunda auditoría de seguridad (ver
`docs/SECURITY-AUDIT.md`).

## Ideas futuras (sin acordar)
| Idea | Valor | Nota |
|---|---|---|
| Notificaciones push del recordatorio de liquidación | Medio | Requiere Web Push + Edge Function con claves VAPID (pospuesta el 2026-11-05) |
| Deshacer una liquidación desde el historial | Bajo | Hoy el historial es inmutable; requeriría RPC que desmarque los gastos |
| Constancia ligada a la liquidación (`receipts.settlement_id`) | Bajo | Hoy se guarda en el gasto más reciente de la liquidación |
| Aplicar reglas de categoría también al crear un gasto a mano | Bajo | Reutiliza `matchCategoryRule` |
| Límite de peticiones en la ruta cron de `cleanup-receipts` | Bajo | Hoy solo valida el secreto de 256 bits |

## Ahorro del plan Free de Supabase (estado)
| Límite Free | Uso actual | Medida aplicada |
|---|---|---|
| Storage 1 GB | ~0 MB | Compresión ≤ 1280 px / ~80-400 KB, PDF ≤ 2 MB, bucket 3 MB, cuota 500 archivos/pareja y 30 subidas/hora, caducidad de 12 meses, limpieza semanal |
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
