<div align="center">
  <h1>💖 DúoFinanzas</h1>
  <p><b>La plataforma definitiva para gestionar las finanzas en pareja de forma transparente, equitativa y sin estrés.</b></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![Notion API](https://img.shields.io/badge/Notion_API-Integrado-black?style=flat-square&logo=notion)](https://developers.notion.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
</div>

---

DúoFinanzas es una aplicación web moderna diseñada para parejas que desean organizar sus finanzas compartidas. Permite registrar ingresos, calcular automáticamente la proporción justa de aportes (Equity) y llevar un control detallado de los gastos y metas de ahorro. Todo esto respaldado por la potencia y flexibilidad de **Notion** como base de datos (Headless CMS).

## ✨ Características Principales

- 📊 **Cálculo de Equidad (Equity):** Los gastos se pueden dividir 50/50 o de manera proporcional a los ingresos de cada uno.
- 💸 **Gestión de Gastos e Ingresos:** Registro intuitivo con soporte para múltiples monedas y categorías personalizadas.
- 🎯 **Metas de Ahorro:** Establece objetivos financieros juntos y visualiza el progreso en tiempo real.
- 🏷️ **Categorías Personalizables:** Crea, edita y elimina categorías para adaptar los gastos a tu estilo de vida.
- 🎨 **Diseño Premium:** Interfaz de usuario "Glassmorphism" con modo oscuro profundo, utilizando Shadcn UI y Tailwind CSS.
- 🔐 **Autenticación Segura:** Sistema de login seguro manejado por NextAuth.

## 🛠️ Tecnologías Utilizadas

- **Frontend:** [Next.js (App Router)](https://nextjs.org/), React 19, Tailwind CSS.
- **Componentes UI:** [Shadcn UI](https://ui.shadcn.com/) (Radix Primitives).
- **Backend / Base de Datos:** [Notion API](https://developers.notion.com/) para persistencia de datos.
- **Autenticación:** [NextAuth.js v5 (Auth.js)](https://authjs.dev/).

## 🚀 Guía de Instalación y Despliegue

### 1. Duplicar la Plantilla de Notion
Para que DúoFinanzas funcione, necesitas la estructura de base de datos en Notion.
1. [Duplica esta plantilla de Notion] *(Inserta aquí el link a tu plantilla pública)* en tu propio espacio de trabajo de Notion.
2. Crea una **Integración Interna de Notion** en [Notion Developers](https://www.notion.so/my-integrations) para obtener el `NOTION_TOKEN`.
3. **Comparte** las bases de datos principales de la plantilla con tu nueva Integración para otorgarle permisos de lectura y escritura.

> **Importante:** La plantilla original ya fue actualizada para soportar la eliminación de registros mediante la propiedad `isArchived` (Checkbox) o archivado nativo.

### 2. Configurar Variables de Entorno
Clona este repositorio y crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# URL de la aplicación (Ej. http://localhost:3000 o tu dominio en producción)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth.js / NextAuth
AUTH_SECRET="genera_un_secreto_seguro_aqui"

# Notion API
NOTION_TOKEN="secret_..."

# IDs de las Bases de Datos de Notion (Extraídos de las URLs de cada base de datos)
USERS_DB_ID="tu_users_db_id"
COUPLES_DB_ID="tu_couples_db_id"
EXPENSES_DB_ID="tu_expenses_db_id"
INCOMES_DB_ID="tu_incomes_db_id"
GOALS_DB_ID="tu_goals_db_id"
CATEGORIES_DB_ID="tu_categories_db_id"
```

### 3. Instalación Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

## 📌 Roadmap de Funcionalidades
- [x] Corrección de errores de renderizado SSR/Client Components.
- [x] CRUD completo (Eliminar registros directamente desde la interfaz).
- [x] Módulo de gestión de categorías dinámico.
- [ ] Exportación de reportes mensuales en PDF/Excel.
- [ ] Recordatorios de pagos recurrentes.

---
*Hecho con ❤️ para parejas que construyen su futuro juntas.*
