# Auditoría de seguridad — v1.4.0 (2026-11-05)

## v1.4.0 · Segunda auditoría
Método: revisión manual de migraciones, Edge Functions, cliente y workflows; consultas a `pg_policies` y
`column_privileges` del proyecto; pruebas de RLS con SQL (usuarios ficticios en transacciones revertidas);
`get_advisors`; `npm audit --omit=dev` (0 vulnerabilidades); E2E (46, incluida la prueba de `<iframe sandbox>`).

| Sev. | Hallazgo | Corrección (migración `0012`) | Verificado |
|---|---|---|---|
| 🔴 Alta | Gastos personales legibles/editables/borrables por la pareja vía API | RLS por operación `is_shared or paid_by = auth.uid()` | ✅ SQL: pareja ve 2 de 3, UPDATE/DELETE = 0 filas |
| 🔴 Alta | Constancias de gastos personales visibles; Storage listable por carpeta | `receipt_target_visible`, `receipt_path_visible`; SELECT de objetos por fila visible u `owner_id` | ✅ SQL: pareja ve 1 de 3 objetos |
| 🟠 Media | Sin AAL2 en `delete_my_account`, `accept_terms`, `profiles_update` | `private.mfa_ok()` | ✅ |
| 🟠 Media | Código de invitación sin rotación | Rota al completarse la pareja y al salir alguien; oculto en Ajustes | ✅ |
| 🟠 Media | `join_couple`: carrera, fuerza bruta, enumeración | `for update`, 10 intentos/hora, respuesta única | ✅ SQL: 11.º intento bloqueado |
| 🟠 Media | Subida directa sin cuota ni formato | Regex de nombre + 500 archivos/pareja + 30/hora; bucket 3 MB | ✅ |
| 🟠 Media | Anti-clickjacking burlable con `sandbox` | Página oculta hasta comprobar `self === top` | ✅ E2E |
| 🟡 Baja | `created_by` falsificable; ingresos con `user_id` ajeno; checks de reparto/FX/textos | Trigger `stamp_created_by`; RLS de ingresos propia; checks | ✅ SQL |
| 🟡 Baja | Reenvíos saltaban el límite de invitaciones; secreto del cron con `=` | Conteo en `admin_audit`; comparación por SHA-256 | ✅ |
| 🟡 Baja | HEIC con EXIF subido sin procesar; errores crudos; CSV `＝`/espacios; CSP con comodín | Rechazo, mensajes genéricos, regex ampliada, build falla sin URL | ✅ tests |
| 🟡 Baja | Workflows: `id-token` en el build, credenciales persistidas, `github.actor` | Permisos por job, `persist-credentials: false`, autor del PR | ✅ |

**Aceptados**: acciones fijadas por tag (Dependabot las actualiza); un JWT emitido sigue válido ~1 h tras banear;
email en `admin_audit` (seguridad); sin límite de peticiones en la ruta cron de `cleanup-receipts` (secreto de
256 bits); `goals.current_amount` editable por la pareja (sus propios datos).

**Pendiente del titular** (panel de Supabase): *Secure password change*, mínimo de contraseña 10 y
*Password requirements*. Ver `docs/PENDIENTES.md`.

## v1.1.0 · Primera auditoría

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
- 58 pruebas unitarias (Vitest) de la lógica de dominio (v1.4.0).
- 46 E2E (Playwright, escritorio y móvil): CSP sin violaciones, anti-clickjacking con `<iframe sandbox>`,
  redirección sin sesión, PWA offline, presupuestos compartido/personal, CSV, reglas de importación, liquidaciones,
  recurrentes, resumen anual con comparativa interanual y MFA en Ajustes. Corren en cada PR (`ci.yml`).
