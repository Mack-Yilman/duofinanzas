# Changelog

Todas las versiones de DúoFinanzas. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y [SemVer](https://semver.org/lang/es/): **MAJOR** = cambios incompatibles, **MINOR** = funcionalidades,
**PATCH** = correcciones.

> Regla: cada PR a `main` sube la versión en `package.json` y añade aquí su entrada. Al fusionar,
> GitHub Actions crea el tag `vX.Y.Z` y su Release automáticamente.

## [1.4.0] - 2026-11-05

### Añadido
- **Historial de liquidaciones** (`/settlements`): cada liquidación queda registrada por moneda (quién pagó a quién,
  monto, fecha, gastos que cerró y su constancia). “Liquidar” y “Liquidar todo” usan la RPC atómica
  `record_settlement` (tabla `settlements` + `expenses.settlement_id`).
- **Reglas de categorización al importar** (tabla `category_rules`): “si la descripción contiene *Wong* →
  Supermercado”, gestionadas en Categorías; gana la regla más específica y la columna Categoría del CSV manda.
- **Presupuesto personal** por categoría (`budgets.user_id`): cuenta solo tus gastos personales y solo lo ves tú;
  el compartido cuenta los gastos compartidos.
- **Comparativa interanual** en `/summary`: total y top categorías frente al año anterior (en el año en curso,
  del 1 de enero a hoy frente al mismo tramo).
- **PDF de boletas electrónicas** como constancia (hasta 2 MB, firma `%PDF-` verificada); se abren en otra pestaña.

### Seguridad
- **Gastos personales privados en la base de datos**: la pareja podía leerlos, editarlos y borrarlos por la API
  (solo la UI los ocultaba). RLS por operación con `is_shared or paid_by = auth.uid()`; lo mismo para sus constancias.
- **Storage**: ya no se puede listar la carpeta de la pareja; nombre de archivo validado y cuota (500 por pareja,
  30 subidas/hora); bucket a 3 MB.
- **MFA** también para eliminar la cuenta, aceptar términos y editar el perfil.
- **Código de invitación**: se desactiva al completarse la pareja y rota si alguien sale; `join_couple` bloquea la
  fila (sin parejas de 3), limita a 10 intentos/hora y no revela si un código existe.
- **Ingresos**: cada persona solo puede crear, editar o borrar los suyos. `created_by` lo fija la base de datos.
- **Integridad**: reparto que suma 100 %, tipo de cambio y textos acotados; límite de invitaciones por envío;
  secreto del cron comparado por resumen SHA-256.
- **Anti-clickjacking** resistente a `<iframe sandbox>` (la página nace oculta); CSP con `upgrade-insecure-requests`
  y sin comodín de Supabase (el build falla si falta la URL).
- **Cliente**: imágenes no procesables se rechazan (antes se subían con EXIF/GPS); mensajes de error sin detalles
  internos; CSV neutraliza fórmulas con espacios o signos de ancho completo; contraseñas de 10+ caracteres.
- **CI**: `id-token` solo en el job de despliegue, `persist-credentials: false`, el check de versión usa el autor del PR.

### Cambiado
- Política de Privacidad actualizada (versión `2026-11-05.2`): se pedirá aceptarla de nuevo.

## [1.3.1] - 2026-11-05

### Añadido
- **Licencia propietaria** (`LICENSE`): © 2026 Mack Chirinos, todos los derechos reservados (D. Leg. 822, Perú).
  El código es visible en GitHub pero no se puede copiar, modificar, desplegar ni distribuir sin permiso escrito.
- Aviso de copyright en el pie de la app, insignia y sección de licencia en el README; `package.json` con
  `"license": "UNLICENSED"` y autor.

## [1.3.0] - 2026-11-05

### Añadido
- **Estadísticas en el dashboard**: gasto del periodo frente al anterior (total y top categorías con % ↑/↓),
  **proyección de cierre** al ritmo diario frente a los presupuestos, y **tasa de ahorro** personal y de la pareja.
- **Gráfico de evolución** acumulado día a día frente al periodo anterior (sustituye al de barras por fecha).
- **Fecha estimada de metas** según el ritmo de aportes de los últimos 3 meses (aviso si llega tarde).
- **Búsqueda y filtros** en Gastos (texto sin tildes, categoría, quién pagó, estado), en la URL y conservados al
  cambiar de periodo; la exportación CSV/PDF respeta los filtros.
- **Editar ingresos** (`/income/edit?id=`), incluido marcarlos como inactivos.
- **Liquidar todo**: salda de una vez los gastos compartidos pendientes, con resumen y constancia opcional.
- **Importar gastos desde CSV** (`/expenses/import`): acepta el formato de la exportación u otro con Fecha,
  Descripción y Monto; vista previa, errores por fila y detección de duplicados.
- **Deshacer al eliminar** gastos, ingresos y metas (5 s).
- 7 E2E nuevos (38 en total en escritorio y móvil) y 14 tests unitarios nuevos (53).

### Corregido
- “Descargar mis datos” no incluía presupuestos ni gastos recurrentes (derecho de acceso, Ley 29733).
- Metas sin fecha objetivo se trataban como si vencieran hoy (`targetDate` ahora es opcional).

## [1.2.0] - 2026-11-05

### Añadido
- **Presupuestos por categoría** (en Categorías): tarjeta en el dashboard con barras, alerta al 80 % y al
  100 % y aviso al guardar un gasto que los cruza. Migración `0009`.
- **Gastos recurrentes** (`/recurring` y “Repetir cada mes” al crear un gasto): se registran solos al abrir la
  app, con el mismo cálculo de tipo de cambio y reparto, sin duplicados entre la pareja (índice único).
- **Exportar** los gastos de la vista a CSV (Excel, protegido contra inyección de fórmulas) o PDF (impresión).
- **Recordatorio de liquidación** en el dashboard cuando faltan ≤ 3 días para el cierre y hay saldos pendientes.
- **Resumen anual** (`/summary`): gastos por mes (compartido/personal), top de categorías y pagado por cada uno.
- **App instalable (PWA)**: manifest, iconos y service worker con modo sin conexión (no guarda datos financieros).
- **Verificación en dos pasos (TOTP)** opcional en Ajustes. Quien la activa necesita el código para entrar y la
  base de datos le niega los datos con solo la contraseña (migración `0010`).
- **Pruebas E2E con Playwright** en CI (24 pruebas, escritorio y móvil, Supabase simulado).

### Cambiado
- Los PR de Dependabot quedan exentos de “Versión obligatoria” (no pueden editar versión/CHANGELOG); sus
  cambios se publican con la siguiente versión. Incluidas sus actualizaciones: `actions/checkout@v7`,
  `actions/setup-node@v7` y React 19.3.1.

### Eliminado
- `netlify.toml`, `PLAN-Finanzas-en-Pareja.md`, el script de migración desde Notion y sus dependencias
  (`@notionhq/client`, `dotenv`, `tsx`), y tipos legacy sin uso.

## [1.1.0] - 2026-11-05

### Añadido
- **Mantenimiento automático de Storage** (migración `0008`): un job semanal de `pg_cron` (domingos 03:17 en Lima)
  caduca las constancias con más de 12 meses y llama a `cleanup-receipts` para borrar los archivos huérfanos.
  El secreto del cron se genera dentro de Supabase Vault (no está en el repositorio).
- Workflow **CI** en cada PR: tipos (`tsc`), lint, tests y build estático.
- Workflow **Keep-alive**: consulta mínima cada 2-3 días para que el plan Free no pause el proyecto.
- **Dependabot** mensual y agrupado para npm y GitHub Actions.

### Cambiado
- Constancias más livianas: lado máximo de 1280 px y WebP con calidad 0,72 (0,6 si pasa de 400 KB), con JPEG
  como respaldo en navegadores sin WebP. `Cache-Control` de 1 año y URLs firmadas de 15 min reutilizadas
  desde la caché, para no volver a descargar las imágenes.
- CSP limitada al host exacto del proyecto de Supabase, con `frame-src`/`worker-src`/`manifest-src` y
  protección contra clickjacking.
- Deploy: `tsc --noEmit`, caché de `.next/cache` y timeouts.
- Política de privacidad (v2026-11-05): retención de constancias de 12 meses. Se vuelve a pedir el consentimiento.

### Seguridad
- `next` 16.2.9 → 16.4.5 y `zod` → 4.6.7: 0 vulnerabilidades en producción (`npm audit --omit=dev`).
- Auditoría completa en `docs/SECURITY-AUDIT.md`.

## [1.0.4] - 2026-11-05

### Corregido
- “Tag y Release”: se quita la entrada manual `ref`. GitHub impide al `GITHUB_TOKEN` crear tags sobre
  commits con workflows distintos a los actuales (HTTP 403); los tags antiguos se crean desde la interfaz.

## [1.0.3] - 2026-11-05

### Cambiado
- Documentación: `main` protegida con un ruleset (PR obligatorio, check `version-check` requerido, sin
  push forzado). Se cierra el pendiente correspondiente.

## [1.0.2] - 2026-11-05

### Corregido
- Edge Functions `admin-invite` y `cleanup-receipts`: desactivada la verificación JWT de la plataforma,
  incompatible con las claves de firma asimétricas (ES256) del proyecto. Cada función ya valida al usuario
  por dentro (`auth.getUser()` + `is_admin`). Se añade `supabase/config.toml`.
- Workflows actualizados a acciones con Node 24 (`checkout@v6`, `setup-node@v6`, `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`); se quita `enablement`, que requiere un token especial.

### Cambiado
- README renovado: insignias de versión y despliegue, arquitectura, flujo de trabajo y backend.

## [1.0.1] - 2026-11-05

### Corregido
- Workflow “Tag y Release”: el tag se crea con la API de GitHub (`gh release create --target`) en lugar de
  `git tag -a`, que fallaba por falta de identidad de git en el runner. Permite etiquetar un commit anterior
  manualmente (entrada `ref`) para publicar la v1.0.0.

## [1.0.0] - 2026-11-05
Primera versión estable publicada en GitHub Pages.

### Añadido
- Sitio estático (Next.js 16) en GitHub Pages con Supabase (Auth, Postgres con RLS, Storage y Edge Functions).
- Acceso solo por invitación del administrador; panel `/admin` con gestión de usuarios, invitaciones,
  auditoría y mantenimiento (limpieza de constancias huérfanas).
- Constancias en imagen opcionales al registrar gastos, al pagar y al aportar a metas.
- Modo claro, oscuro o del sistema.
- Cumplimiento Ley N.º 29733: privacidad, términos, cookies, consentimiento registrado y derechos ARCO.
- Versionado obligatorio por PR, tags y releases automáticos.

### Seguridad
- Aislamiento por pareja con RLS, helpers en esquema `private`, CSP y auditoría `security-review`.
