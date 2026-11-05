# Auditoría de seguridad — v1.1.0 (2026-11-05)

Alcance: código del sitio estático, workflows de GitHub, Edge Functions, base de datos y Storage del proyecto
Supabase `vjglzizutcijcyexcume` (plan Free). Método: `get_advisors` (security y performance), consultas al
catálogo de Postgres, `npm audit`, búsqueda de secretos en todo el historial de Git, revisión manual y una
prueba con Playwright del build (CSP sin violaciones).

## Resultado

| Área | Comprobación | Estado |
|---|---|---|
| RLS | Todas las tablas de `public` con RLS activado | ✅ |
| Grants | `anon` sin privilegios en tablas ni funciones de `public` | ✅ |
| SECURITY DEFINER | Todas con `search_path` fijado; las internas en `private` | ✅ |
| Storage | Bucket `receipts` privado, 5 MB, solo imágenes, políticas por carpeta `<couple_id>/`, sin UPDATE | ✅ |
| Registro | Trigger `enforce_invite_only` en `auth.users` (solo por invitación) | ✅ |
| Edge Functions | CORS por lista, JWT + `is_admin`, `redirectTo` en el servidor, límite de invitaciones | ✅ |
| Cron | Secreto de 256 bits generado en Vault y validado por una RPC solo para service_role | ✅ |
| Tablas nuevas (v1.2.0) | `budgets`, `recurring_expenses`: RLS, revoke a anon, políticas por pareja; categoría y pagador validados; recurrentes personales solo visibles para quien paga | ✅ probado con SQL |
| `expenses.recurring_id` | La política impide enlazar plantillas de otra pareja (las FK no aplican RLS) | ✅ corregido |
| MFA (TOTP) | Opcional; con factor verificado, RLS y admin exigen AAL2 en la BD (`private.mfa_ok`) | ✅ probado: AAL1 → 0 filas, AAL2 → acceso |
| Service worker | Solo GET del mismo origen; nunca cachea Supabase ni datos financieros | ✅ |
| Exportar CSV | Celdas que empiezan con `= + - @` se neutralizan (inyección de fórmulas) | ✅ test |
| Secretos | Sin service role, `sb_secret_` ni JWT en el historial; `.env*` ignorado | ✅ |
| Dependencias | `npm audit --omit=dev`: 0 vulnerabilidades (antes 1 crítica y 3 altas) | ✅ corregido |
| CSP | Antes `*.supabase.co`; ahora el host exacto del proyecto + `frame-src 'none'` | ✅ corregido |
| Clickjacking | Pages no envía `X-Frame-Options` → script que sale de iframes ajenos | ✅ corregido |
| CI | Los PR no compilaban ni revisaban tipos → `ci.yml` | ✅ corregido |
| Contraseñas filtradas | Requiere plan Pro (aviso `auth_leaked_password_protection`) | ⚠️ aceptado |

## Avisos del linter de Supabase (aceptados por diseño)
- `rls_enabled_no_policy` en `admin_audit`, `app_admins` e `invitations`: sin políticas a propósito, solo se
  accede vía RPC o service role (denegado por defecto).
- `authenticated_security_definer_function_executable` (13): son las RPC de la app (`create_couple`,
  `join_couple`, `accept_terms`, `delete_my_account`, `admin_*`). Cada `admin_*` verifica `admin_assert()`.
- `unused_index` (2): índices de claves foráneas; se usarán cuando haya datos.

## Riesgos residuales y recomendaciones
| Riesgo | Mitigación actual | Recomendación (sin costo) |
|---|---|---|
| Contraseñas débiles (sin HIBP en Free) | Solo por invitación | Auth → *Password requirements*: mínimo 10 caracteres + dígitos, mayúsculas, minúsculas y símbolos |
| `script-src 'unsafe-inline'` en la CSP | Necesario para el export estático de Next; sin `dangerouslySetInnerHTML` con datos de usuario | Mantener; revisar si Next permite nonces/hashes en export |
| Subida directa de archivos de 5 MB (saltándose la compresión) | Usuarios invitados, máx. 5 por registro, caducidad de 12 meses | Si se abre a más personas, bajar el límite del bucket |
| Pausa del proyecto Free | `keepalive.yml` | Revisar el correo de Supabase |
| Copias de seguridad (Free no tiene PITR) | Exportación ARCO desde la app | Descargar los datos cada mes (*Ajustes → Mis datos → Descargar*) |
| Cuenta admin sin MFA | MFA disponible en Ajustes | Activarla en la cuenta de administrador |

## Pruebas automáticas
- 41 pruebas unitarias (Vitest) de la lógica de dominio.
- 24 E2E (Playwright, escritorio y móvil): CSP sin violaciones, redirección sin sesión, PWA offline, presupuestos,
  CSV, recurrentes, resumen anual y MFA en Ajustes. Corren en cada PR (`ci.yml`).
