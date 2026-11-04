# Pendientes

Lista viva de tareas acordadas que quedan abiertas. Al cerrar una, muévela a `docs/ERRORS.md` o
`docs/INSIGHTS.md` según corresponda.

| Prioridad | Tarea | Responsable |
|---|---|---|
| 🟡 Media | SMTP propio + plantillas de correo en español | Titular (panel de Supabase) |
| 🟡 Media | Purgar el DNI del historial público de Git | Titular (requiere push forzado) |
| 🟢 Baja | Limpieza de imágenes huérfanas en Storage | Agente |
| 🟢 Baja | Activar “Leaked password protection” | Titular (si el plan lo incluye) |
| ⚪ Opcional | Inscribir el banco de datos ante la ANPD | Titular |

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

## Purgar el DNI del historial de Git
El DNI ya no se publica (PR #5), pero sigue en el historial del repositorio público (commit del PR #4,
`lib/legal.ts`). Para eliminarlo hay que reescribir `main` (p. ej. `git filter-repo` + push forzado).
La sesión del agente no tiene permiso para hacer push forzado.

## Limpieza de imágenes huérfanas
Cuando el admin elimina una cuenta o una pareja queda vacía, la base borra los registros pero los
archivos de Storage no se pueden borrar con SQL (`storage.protect_delete`). Opción: Edge Function
programada que compare `storage.objects` del bucket `receipts` con la tabla `receipts`.

## Leaked password protection
Aviso de Supabase Advisors. Authentication → Sign In / Providers → Email → *Prevent use of leaked
passwords* (puede requerir plan Pro).

## Inscripción ante la ANPD
Opcional mientras el uso sea exclusivamente personal o familiar (excepción del art. 3 de la Ley 29733).
Hacerlo si la app se abre a más personas.
