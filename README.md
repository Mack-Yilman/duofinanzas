<div align="center">
  <h1>💖 DúoFinanzas</h1>
  <p><b>La plataforma definitiva para gestionar las finanzas en pareja de forma transparente, equitativa y sin estrés.</b></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

DúoFinanzas es una aplicación web para parejas que desean organizar sus finanzas compartidas: registra ingresos, calcula la proporción justa de aportes (Equity) y controla gastos y metas de ahorro.

Es un **sitio 100 % estático** (Next.js `output: "export"`) que se publica en **GitHub Pages**. Los datos y el login viven en **Supabase** (Postgres + Auth), y la seguridad la imponen políticas **Row Level Security**: cada pareja solo puede leer y modificar sus propios registros.

## ✨ Características

- 📊 **Equity:** gastos 50/50 o proporcionales a los ingresos de cada uno.
- 💸 **Gastos e ingresos** en PEN, USD y EUR, con categorías personalizables.
- 🎯 **Metas de ahorro** con historial de aportes por persona.
- 📅 **Periodos** con día de corte configurable y vista mensual/global.
- 🔐 **Auth de Supabase** + RLS por pareja.

## 🏗️ Arquitectura

```
GitHub Pages (HTML/JS estático)
  └── Navegador ── supabase-js (anon key pública) ──► Supabase
                                                     ├── Auth (email + contraseña)
                                                     └── Postgres + RLS (por pareja)
```

| Carpeta | Contenido |
|---|---|
| `app/` | Páginas (componentes cliente) |
| `lib/repos/` | Acceso a datos (Supabase) |
| `lib/actions/` | Mutaciones de formularios (cliente) |
| `lib/domain/` | Lógica pura y testeada: reparto, periodos, FX |
| `supabase/migrations/` | Esquema SQL, triggers, RPCs y políticas RLS |
| `scripts/` | Migración única desde Notion |

## 🚀 Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → ejecuta en orden `supabase/migrations/0001_init.sql` y `0002_private_helpers.sql`.
3. **Authentication → URL Configuration**: agrega la URL de tu sitio (p. ej. `https://<usuario>.github.io/duofinanzas/`).
4. Opcional para pruebas: **Authentication → Providers → Email** → desactiva *Confirm email*.

### 2. Local

```bash
cp .env.example .env.local   # completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas de dominio (vitest)
npm run build                # genera out/ (sitio estático)
```

### 3. GitHub Pages
1. **Settings → Pages → Source:** *GitHub Actions*.
2. **Settings → Secrets and variables → Actions → Variables:** crea `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Cada push a `main` ejecuta lint + tests + build y publica (`.github/workflows/deploy-pages.yml`).

### 4. Migrar datos desde Notion (una sola vez)
Con `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN` y los `*_DB_ID` en `.env.local` (nunca en el repo):

```bash
npm run migrate:notion
```

El script imprime contraseñas temporales; cada usuario puede cambiarla en **Ajustes → Cambiar contraseña**.

## 🛡️ Administración y seguridad

- **Panel `/admin`** (solo cuentas en `app_admins`): estadísticas, búsqueda de usuarios, enviar correo de recuperación, bloquear/desbloquear (cierra sesiones), quitar de una pareja, dar/quitar rol de admin y eliminar cuentas. Todo queda en `admin_audit`.
- El admin **no** puede ver los datos financieros de las parejas: solo gestiona cuentas.
- Para nombrar otro admin desde SQL:
  ```sql
  insert into public.app_admins (user_id)
  select id from auth.users where email = 'correo@ejemplo.com' on conflict do nothing;
  ```
- RLS en todas las tablas, `anon` sin acceso, helpers de RLS en un esquema `private` no expuesto, CSP que solo permite conexiones a Supabase y a la API de tipos de cambio, y contraseñas de 8+ caracteres.

## 📌 Roadmap de Funcionalidades
- [x] Corrección de errores de renderizado SSR/Client Components.
- [x] CRUD completo (Eliminar registros directamente desde la interfaz).
- [x] Módulo de gestión de categorías dinámico.
- [x] Migración a Supabase + GitHub Pages (sitio estático).
- [ ] Exportación de reportes mensuales en PDF/Excel.
- [ ] Recordatorios de pagos recurrentes.

---
*Hecho con ❤️ para parejas que construyen su futuro juntas.*
