<div align="center">

# 💚 DúoFinanzas

**Finanzas en pareja, claras y justas.** Registren ingresos y gastos, repartan cada pago según lo que gana
cada uno y lleven sus metas de ahorro juntos, con constancias de pago y privacidad por diseño.

[![Release](https://img.shields.io/github/v/release/Mack-Yilman/duofinanzas?label=versi%C3%B3n&style=flat-square)](https://github.com/Mack-Yilman/duofinanzas/releases)
[![Deploy](https://img.shields.io/github/actions/workflow/status/Mack-Yilman/duofinanzas/deploy-pages.yml?label=GitHub%20Pages&style=flat-square)](https://github.com/Mack-Yilman/duofinanzas/actions/workflows/deploy-pages.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/Mack-Yilman/duofinanzas/ci.yml?label=CI&style=flat-square)](https://github.com/Mack-Yilman/duofinanzas/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**[Abrir la app →](https://mack-yilman.github.io/duofinanzas/)**

</div>

## ✨ Qué hace

| | Función |
|---|---|
| 📊 | **Reparto justo**: cada gasto se divide 50/50 o en proporción a los ingresos de cada uno. |
| 💸 | **Gastos e ingresos** en PEN, USD y EUR, con categorías y periodos según tu día de corte. |
| 🧾 | **Constancias opcionales**: foto del voucher al registrar, al pagar o al aportar a una meta (comprimida y conservada 12 meses). |
| 🎯 | **Metas de ahorro** con historial de aportes por persona. |
| 🌗 | **Modo claro, oscuro o del sistema**, pensado para el móvil. |
| 🔐 | **Acceso solo por invitación** del administrador, con panel de gestión y auditoría. |
| ⚖️ | **Ley N.º 29733 (Perú)**: privacidad, términos, cookies, consentimiento y derechos ARCO en la app. |

## 🏗️ Arquitectura

```
GitHub Pages (Next.js 16 · export estático)
 └── Navegador ── supabase-js ──► Supabase
                                  ├── Auth (solo por invitación)
                                  ├── Postgres + Row Level Security (aislamiento por pareja)
                                  ├── Storage privado (constancias, URLs firmadas)
                                  ├── Edge Functions (admin-invite, cleanup-receipts)
                                  └── pg_cron (mantenimiento semanal del Storage)
```

No hay servidor propio: la seguridad vive en las políticas RLS de Postgres. Detalle completo en
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🚀 Desarrollo local

```bash
git clone https://github.com/Mack-Yilman/duofinanzas.git
cd duofinanzas
npm install
cp .env.example .env.local   # URL y clave publishable de Supabase
npm run dev                  # http://localhost:3000
```

| Comando | Para qué |
|---|---|
| `npx tsc --noEmit` | Revisión de tipos |
| `npm test` | Pruebas de la lógica de dominio (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Genera el sitio estático en `out/` |
| `npm run version:check` | Verifica que subiste la versión y el CHANGELOG |

## 🔄 Flujo de trabajo

```
rama ─► subir versión (package.json) + CHANGELOG.md ─► PR ─► checks "version-check" + "CI" ✅
     ─► fusionar en main ─► tag vX.Y.Z + Release ─► despliegue automático a GitHub Pages
```

Además: **Dependabot** abre PRs mensuales agrupados y **Keep-alive** consulta Supabase 3 veces por semana
para que el plan Free no pause el proyecto.

Versionado [SemVer](https://semver.org/lang/es/): **patch** = arreglos · **minor** = funcionalidades ·
**major** = cambios incompatibles. Historial en [`CHANGELOG.md`](CHANGELOG.md).

## 🗄️ Backend (Supabase)

1. Ejecuta en orden los archivos de [`supabase/migrations/`](supabase/migrations).
2. Despliega las funciones de [`supabase/functions/`](supabase/functions) con `verify_jwt = false`
   (ver [`supabase/config.toml`](supabase/config.toml): validan al usuario por dentro).
3. En Auth: desactiva *Allow new users to sign up* y configura la *Site URL* del sitio.
4. El primer administrador se registra en `public.app_admins`.
5. La migración `0008` activa `pg_cron` + `pg_net` y genera el secreto del cron en Vault (nada que configurar).

### 💾 Cómo rinde el plan Free
| Límite | Medida |
|---|---|
| Storage 1 GB | Constancias ≤ 1280 px en WebP (~80-400 KB), caducan a los 12 meses, limpieza semanal de huérfanas |
| Transferencia 5 GB/mes | `Cache-Control` de 1 año + URLs firmadas reutilizadas |
| Pausa por inactividad | Workflow `keepalive.yml` |

## 📚 Documentación

| Archivo | Contenido |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Reglas del proyecto y cómo retomar el trabajo |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura, modelo de datos y seguridad |
| [`docs/INSIGHTS.md`](docs/INSIGHTS.md) | Decisiones y aprendizajes |
| [`docs/ERRORS.md`](docs/ERRORS.md) | Bitácora de errores y soluciones |
| [`docs/PENDIENTES.md`](docs/PENDIENTES.md) | Tareas abiertas y propuestas de mejora |
| [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md) | Auditoría de seguridad |

<div align="center"><sub>Proyecto personal sin fines comerciales · Hecho con ❤️ en Perú</sub></div>
