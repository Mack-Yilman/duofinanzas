# Pendientes

Lista viva de tareas acordadas que quedan abiertas. Al cerrar una, muévela a `docs/ERRORS.md` o
`docs/INSIGHTS.md` según corresponda.

| Prioridad | Tarea | Responsable |
|---|---|---|
| 🟡 Media | SMTP propio + plantillas de correo en español | Titular (panel de Supabase) |
| 🟡 Media | Proteger `main`: exigir el check “Versión obligatoria” (Settings → Branches) | Titular |
| ⚪ Opcional | “Leaked password protection” (requiere plan Pro) | Titular, si se escala |
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

## Proteger la rama main
Para que el versionado sea realmente obligatorio: GitHub → Settings → Branches → *Add branch ruleset*
(o *Add classic branch protection rule*) para `main` → *Require a pull request before merging* y
*Require status checks to pass* → añadir **version-check**.

## Leaked password protection
No disponible en el plan Free (verificado el 2026-11-04). Mientras tanto se puede activar
*Password requirements* (dígitos, mayúsculas, minúsculas y símbolos) en Auth → Email.

## Inscripción ante la ANPD
Opcional mientras el uso sea exclusivamente personal o familiar (excepción del art. 3 de la Ley 29733).
Hacerlo si la app se abre a más personas.
