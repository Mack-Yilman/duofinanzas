# Changelog

Todas las versiones de DúoFinanzas. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y [SemVer](https://semver.org/lang/es/): **MAJOR** = cambios incompatibles, **MINOR** = funcionalidades,
**PATCH** = correcciones.

> Regla: cada PR a `main` sube la versión en `package.json` y añade aquí su entrada. Al fusionar,
> GitHub Actions crea el tag `vX.Y.Z` y su Release automáticamente.

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
