# PLAN DE CONSTRUCCIÓN — "DúoFinanzas": App de Finanzas en Pareja

> **Documento de especificación e implementación.** Este archivo está escrito para que **otra IA / LLM lo ejecute de principio a fin**. Contiene la visión, el diseño visual, el modelo de datos, la lógica de negocio, los flujos, la arquitectura y un plan de implementación por fases con criterios de aceptación. Léelo completo antes de escribir una sola línea de código.
>
> **Idioma de la app:** Español (es-ES / es-LATAM). **Idioma del código y los identificadores:** inglés.
>
> **Versión del plan:** 1.0 · **Fecha:** 2026-06-26

---

## 0. TL;DR para la IA ejecutora

Vas a construir una **aplicación web de finanzas para parejas** cuyo diferenciador central es el **reparto proporcional de gastos según el ingreso de cada persona** (no 50/50, sino "mismo esfuerzo relativo"). Es una **demo técnica de alta calidad** con **Notion como backend** (base de datos, almacenamiento de archivos y fuente de auth), pensada para migrar después a un backend más potente sin reescribir el frontend.

- **Stack:** Next.js 14+ (App Router, TypeScript) · Tailwind CSS + shadcn/ui · NextAuth (Credentials) · `@notionhq/client` · Frankfurter API (FX) · Recharts · Zod · TanStack Query.
- **Regla de oro:** **Notion SOLO se toca desde el servidor** (Server Actions / Route Handlers). El cliente nunca ve el token ni llama a Notion. Hay una **capa de caché** obligatoria por el límite de ~3 req/seg.
- **Entregable:** app responsive (móvil-first), con dashboard, gastos, ingresos, presupuestos, deudas/préstamos, metas de ahorro, gastos recurrentes, liquidaciones (settlements), reportes y multi-moneda, **desplegada y publicada en Netlify** (§23).

Si en algún punto Notion no permite algo (ver §2.3 Limitaciones), aplica el **mitigante documentado**, no inventes una solución que rompa la regla de oro.

---

## 1. Visión y principios de producto

### 1.1 El problema
Las parejas con ingresos distintos enfrentan tensión al repartir gastos. Un 50/50 castiga a quien gana menos (gasta un % mayor de su sueldo). La app resuelve esto repartiendo cada gasto compartido **en proporción al ingreso**, manteniendo a la vez la foto completa de las finanzas del hogar (al estilo Honeydue) y la claridad de "quién debe a quién" (al estilo Splitwise), pero sin sus carencias (Splitwise no tiene presupuestos ni metas; Honeydue no hace reparto proporcional fino).

### 1.2 Principios de diseño de producto
1. **Equidad por defecto, flexibilidad por elección.** El modo por defecto es proporcional, pero cada gasto puede forzarse a 50/50, 100% de una persona, o porcentaje manual.
2. **Transparencia total.** Ambos miembros ven todo lo compartido. Lo "personal" puede marcarse como privado (opcional, ver §11.2).
3. **Cero fricción para registrar.** Añadir un gasto debe tomar < 10 segundos (formulario corto + valores por defecto inteligentes).
4. **La app calcula, la pareja decide.** Mostramos el reparto sugerido y el balance, pero las liquidaciones las confirma el usuario.
5. **Sin sorpresas de dinero.** Toda cifra mostrada indica su moneda y, si fue convertida, la tasa y fecha usadas.

### 1.3 Anti-objetivos (YAGNI para la demo)
- ❌ Integración bancaria real (open banking) — fuera de alcance de la demo; se deja en roadmap (§24).
- ❌ App móvil nativa — se hace **PWA responsive** en su lugar.
- ❌ Multi-pareja / SaaS multi-tenant con facturación — la demo soporta **1 pareja (2 personas)**; el modelo de datos se diseña para escalar a N parejas pero la UI no expone gestión de planes.
- ❌ Reportes fiscales / declaración de impuestos.

---

## 2. Decisiones de arquitectura (LEER ANTES DE CODIFICAR)

### 2.1 Por qué Notion como backend (y qué implica)
El usuario quiere una **demo altamente funcional** antes de invertir en infraestructura. Notion ofrece: bases de datos estructuradas, UI de administración gratis (la pareja puede ver/editar datos en Notion mismo), almacenamiento de archivos y una API REST oficial. Es ideal para prototipar el dominio.

**Trade-off aceptado:** Notion NO es una base de datos transaccional. Por eso toda la lógica vive en el servidor de Next.js, con una **capa de abstracción de repositorio** (`/lib/repos/*`) que aísla a Notion. Cuando se migre a Postgres/Supabase, **solo se reescribe esa capa**, no el resto de la app.

### 2.2 Capas de la aplicación
```
┌──────────────────────────────────────────────────────────────┐
│  CLIENTE (React Client Components)                             │
│  - UI, formularios, gráficos, optimistic updates              │
│  - NUNCA importa @notionhq/client ni ve NOTION_TOKEN          │
└───────────────▲──────────────────────────────────────────────┘
                │ Server Actions / fetch a Route Handlers
┌───────────────┴──────────────────────────────────────────────┐
│  SERVIDOR (Next.js: Server Actions + Route Handlers)          │
│  - Validación con Zod                                          │
│  - Lógica de negocio (split, settlements, FX)  → /lib/domain  │
│  - Autorización (sesión NextAuth)                             │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│  CAPA DE REPOSITORIO  → /lib/repos                            │
│  - CRUD tipado contra Notion (mapea page <-> entidad)         │
│  - Reintentos con backoff (429/529), respeta Retry-After      │
└───────────────▲──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│  CACHÉ  → /lib/cache  (obligatoria por rate limit 3 req/s)    │
│  - unstable_cache / revalidateTag de Next.js                  │
│  - Tasas FX cacheadas 24h; listas cacheadas con tags          │
└───────────────▲──────────────────────────────────────────────┘
                │
        ┌───────┴────────┐         ┌──────────────────────┐
        │  Notion API    │         │  Frankfurter API (FX)│
        └────────────────┘         └──────────────────────┘
```

### 2.3 Limitaciones de Notion y mitigantes OBLIGATORIOS

> **Workspace en plan Notion Plus.** El usuario tiene **Notion Plus**, lo que relaja dos límites importantes: (1) **archivos hasta ~5 GB por archivo y subidas ilimitadas** (vs 5 MB en free) → recibos/imágenes sin preocupación de tamaño; (2) un **techo agregado de requests por workspace más alto**. **PERO ojo:** el límite de **~3 requests/segundo es por integración y NO cambia con el plan**. Por lo tanto, **la capa de caché, el backoff y la concurrencia limitada SIGUEN SIENDO OBLIGATORIOS**. No asumas que Plus elimina la necesidad de cachear.

| Limitación real | Impacto | Mitigante a implementar |
|---|---|---|
| **~3 req/seg por integración** (429 si se excede) | Listas grandes o muchas escrituras se ralentizan | Capa de caché con `unstable_cache` + `revalidateTag`. Cola de escritura serializada con backoff exponencial. Nunca hacer N llamadas en paralelo sin límite (usar un limitador de concurrencia, p.ej. `p-limit` con concurrencia 2-3). |
| **No hay "ORDER BY/WHERE" SQL completo**; filtros sí, pero limitados | Consultas complejas | Filtrar/ordenar con la API cuando se pueda; el resto **en memoria en el servidor** tras traer el dataset (los volúmenes de una pareja son pequeños: cientos de filas). |
| **Paginación de 100 ítems por página** | Datasets medianos | Implementar helper `queryAll()` que itera `next_cursor` hasta agotar. |
| **Payload máx. 500KB / 1000 bloques / arrays de 100** | Escrituras masivas | No aplica a finanzas normales; el seeding crea filas de a una. |
| **File upload** (Direct Upload API `/v1/file_uploads`). Plan **Plus: hasta ~5 GB/archivo, ilimitados**; single-part < 20 MiB, multi-part por encima | Recibos/imágenes | Con Plus no hay problema de tamaño para recibos. Aun así: comprimir imágenes en cliente (~1–2 MiB) por UX/velocidad; usar single-part (< 20 MiB) para recibos normales y reservar multi-part solo si algún día se suben PDFs grandes. Permitir también pegar URL externa como alternativa. Leer el tamaño máximo real del bot desde el bot user object al iniciar. |
| **Notion NO autentica usuarios finales** | Login | Auth propia: NextAuth con provider **Credentials**; los usuarios viven en la DB `Users` de Notion con hash de contraseña (bcrypt). Ver §7. |
| **Latencia de la API (cientos de ms)** | UX lenta si se espera | **Optimistic UI** en mutaciones + skeletons en lecturas. |
| **Concurrencia / no hay transacciones** | Condiciones de carrera | Para la demo (2 usuarios) el riesgo es bajo. Las operaciones críticas (liquidaciones) recalculan desde el estado actual antes de escribir. |

### 2.4 Regla de oro (repetida porque importa)
> **El token de Notion (`NOTION_TOKEN`) es secreto de servidor.** Vive solo en variables de entorno del servidor. Ningún Client Component, ningún `NEXT_PUBLIC_*`, ninguna llamada desde el navegador toca Notion directamente. Todo pasa por Server Actions o Route Handlers.

---

## 3. Stack tecnológico exacto

| Capa | Tecnología | Versión / nota |
|---|---|---|
| Framework | **Next.js** (App Router, RSC, Server Actions) | 14+ (o 15) |
| Lenguaje | **TypeScript** (strict) | 5+ |
| UI base | **Tailwind CSS** | 3.4+ |
| Componentes | **shadcn/ui** (Radix + Tailwind) | última |
| Iconos | **lucide-react** | última |
| Auth | **NextAuth.js (Auth.js)** provider Credentials + JWT sessions | 5 (beta) o 4 estable |
| Hash contraseñas | **bcryptjs** | última |
| Cliente Notion | **@notionhq/client** | última |
| Validación | **Zod** | 3+ |
| Data fetching cliente | **@tanstack/react-query** | 5+ |
| Formularios | **react-hook-form** + `@hookform/resolvers/zod` | última |
| Gráficos | **Recharts** | 2+ |
| Fechas | **date-fns** + `date-fns-tz` | última |
| FX (divisas) | **Frankfurter API** (`https://api.frankfurter.dev`) sin key | — |
| Concurrencia | **p-limit** | última |
| Toasts/UX | **sonner** | última |
| Estado de tema | **next-themes** (dark/light) | última |
| Tests | **Vitest** (unit lógica financiera) + **Playwright** (e2e crítico) | última |
| Lint/format | ESLint + Prettier | — |
| Deploy demo | **Netlify** (Next.js Runtime v5, `@netlify/plugin-nextjs`) | El LLM ejecutor ya tiene token de Netlify. Ver §23. |

> **Nota para la IA:** usa el App Router con Server Actions como mecanismo principal de mutación. Usa React Query en el cliente solo para lecturas que necesiten revalidación/optimistic; muchas lecturas pueden resolverse en Server Components directamente.

---

## 4. Modelo de datos en Notion

Cada "tabla" es una **Notion Database**. Las relaciones se hacen con propiedades **Relation**. Todas las DBs viven dentro de una página contenedora "DúoFinanzas — DB". Los IDs de cada database se guardan en variables de entorno (§19).

> **Convención:** El campo `Title` de cada database (obligatorio en Notion) se usa como nombre legible o como ID semántico. Guardamos también un campo `extId` (UUID propio) en algunas entidades para portabilidad futura.

> **Importante sobre montos:** Notion no tiene tipo "decimal con moneda". Guardamos el monto como **Number** y la moneda como **Select**. Para evitar errores de coma flotante, los importes se manejan en la lógica en **unidades menores enteras cuando sea posible** (centavos) — pero como Notion guarda Number, almacenamos el valor decimal y redondeamos a 2 decimales en una única función `money()` centralizada. Documentar esto en `/lib/domain/money.ts`.

### 4.1 Database: `Couples` (parejas / hogares)
| Propiedad | Tipo Notion | Descripción |
|---|---|---|
| Name | Title | Nombre del hogar (ej. "Casa Ana & Luis") |
| baseCurrency | Select | Moneda base de reporte (ISO 4217: PEN, USD, EUR…) |
| splitDefaultMode | Select | `proportional` \| `equal` \| `custom` (modo por defecto de nuevos gastos) |
| createdAt | Created time | — |
| members | Relation → Users | Miembros (2 para la demo) |

### 4.2 Database: `Users`
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Nombre visible |
| email | Email | Login |
| passwordHash | Rich text | bcrypt hash (¡NUNCA exponer al cliente!) |
| avatarColor | Select | Color de acento del usuario (para UI) |
| couple | Relation → Couples | Pareja a la que pertenece |
| role | Select | `owner` \| `member` (demo: ambos pueden todo) |
| createdAt | Created time | — |

### 4.3 Database: `Incomes` (ingresos)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Etiqueta (ej. "Sueldo junio") |
| user | Relation → Users | Dueño del ingreso |
| amount | Number | Monto |
| currency | Select | ISO 4217 |
| type | Select | `salary` \| `freelance` \| `bonus` \| `other` |
| period | Select | `monthly` \| `one_time` |
| effectiveDate | Date | Fecha desde la que aplica (para histórico de % de reparto) |
| isActive | Checkbox | Si cuenta para el cálculo de proporción actual |
| notes | Rich text | — |

> El **% de reparto** de cada persona se calcula a partir de la suma de ingresos `isActive == true` y `period == monthly` (normalizando a moneda base). Ver §5.

### 4.4 Database: `Categories`
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Supermercado" |
| icon | Select | nombre de icono lucide (ej. `shopping-cart`) |
| color | Select | color del badge |
| kind | Select | `shared` \| `personal` \| `both` |
| couple | Relation → Couples | — |
| isArchived | Checkbox | — |

> Semilla de categorías por defecto en §20.

### 4.5 Database: `Expenses` (gastos)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Descripción del gasto |
| amount | Number | Monto en `currency` |
| currency | Select | ISO 4217 |
| amountBase | Number | Monto convertido a moneda base (calculado al guardar) |
| fxRate | Number | Tasa usada (currency→base); 1 si igual |
| fxDate | Date | Fecha de la tasa |
| date | Date | Fecha del gasto |
| category | Relation → Categories | — |
| paidBy | Relation → Users | Quién pagó realmente |
| splitMode | Select | `proportional` \| `equal` \| `custom` \| `owner_100` |
| splitShareA | Number | % asignado a miembro A (0–100), redundante para auditoría |
| splitShareB | Number | % asignado a miembro B |
| isShared | Checkbox | true = compartido; false = personal de `paidBy` |
| isSettled | Checkbox | Si ya entró en una liquidación |
| settlement | Relation → Settlements | Liquidación que lo incluye |
| recurringSource | Relation → RecurringExpenses | Si fue generado por una regla recurrente |
| receiptUrl | URL | URL del recibo (file upload Notion o externo) |
| notes | Rich text | — |
| createdBy | Relation → Users | Quién lo registró |
| createdAt | Created time | — |

> **`splitShareA/B` y "miembro A/B":** se define A = primer miembro de `Couples.members`, B = segundo, de forma estable y ordenada. Documentar el criterio de orden (por `createdAt` del User, ascendente) en `/lib/domain/couple.ts`.

### 4.6 Database: `Budgets` (presupuestos)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Presupuesto Supermercado" |
| category | Relation → Categories | Categoría que limita (opcional si es global) |
| amountBase | Number | Límite mensual en moneda base |
| month | Select o Date | Periodo (`YYYY-MM`) o "recurrente mensual" |
| isRecurring | Checkbox | Aplica todos los meses |
| couple | Relation → Couples | — |

### 4.7 Database: `Debts` (deudas y préstamos)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Préstamo auto" |
| kind | Select | `loan_owed` (debemos) \| `loan_given` (nos deben) \| `credit_card` \| `mortgage` |
| principal | Number | Monto original |
| currentBalance | Number | Saldo actual |
| currency | Select | — |
| interestRate | Number | % anual (opcional) |
| monthlyPayment | Number | Cuota mensual |
| responsibility | Select | `shared` \| `userA` \| `userB` (quién responde; si shared → reparto proporcional) |
| dueDay | Number | Día del mes de pago |
| startDate | Date | — |
| endDate | Date | Fecha estimada de fin (opcional) |
| couple | Relation → Couples | — |
| isClosed | Checkbox | — |

### 4.8 Database: `Goals` (metas de ahorro)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Viaje a Cusco" |
| targetAmount | Number | Meta |
| currentAmount | Number | Ahorrado |
| currency | Select | — |
| targetDate | Date | Fecha objetivo |
| contributionMode | Select | `proportional` \| `equal` \| `custom` |
| icon | Select | — |
| couple | Relation → Couples | — |
| isAchieved | Checkbox | — |

### 4.9 Database: `GoalContributions`
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | auto (ej. "Aporte 2026-06 Luis") |
| goal | Relation → Goals | — |
| user | Relation → Users | — |
| amount | Number | — |
| currency | Select | — |
| date | Date | — |

### 4.10 Database: `RecurringExpenses` (gastos recurrentes / suscripciones)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Netflix", "Alquiler" |
| amount | Number | — |
| currency | Select | — |
| category | Relation → Categories | — |
| paidBy | Relation → Users | — |
| splitMode | Select | igual que Expenses |
| frequency | Select | `monthly` \| `weekly` \| `yearly` |
| dayOfMonth | Number | Día de cobro |
| nextRun | Date | Próxima fecha a materializar |
| isActive | Checkbox | — |
| couple | Relation → Couples | — |

### 4.11 Database: `Settlements` (liquidaciones)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | Ej. "Liquidación junio 2026" |
| periodStart | Date | — |
| periodEnd | Date | — |
| fromUser | Relation → Users | Quien paga el saldo |
| toUser | Relation → Users | Quien recibe |
| amountBase | Number | Monto neto a transferir |
| status | Select | `draft` \| `confirmed` \| `paid` |
| expensesCount | Number | Nº de gastos incluidos |
| couple | Relation → Couples | — |
| confirmedAt | Date | — |

### 4.12 Database: `ExchangeRates` (caché de tasas, opcional)
| Propiedad | Tipo | Descripción |
|---|---|---|
| Name | Title | `BASE-QUOTE-YYYY-MM-DD` |
| base | Select | — |
| quote | Select | — |
| rate | Number | — |
| date | Date | — |

> Alternativa más simple: cachear tasas FX en memoria/`unstable_cache` 24h sin tocar Notion. **Recomendado: caché en memoria**; usar esta DB solo si se quiere histórico auditable. Implementar detrás de la interfaz `FxProvider`.

### 4.13 Diagrama de relaciones (resumen)
```
Couples 1───* Users
Couples 1───* Categories, Budgets, Debts, Goals, RecurringExpenses, Settlements
Users   1───* Incomes, GoalContributions
Users   1───* Expenses (paidBy, createdBy)
Categories 1─* Expenses, Budgets
Goals   1───* GoalContributions
RecurringExpenses 1─* Expenses (recurringSource)
Settlements 1──* Expenses
```

---

## 5. Lógica de negocio núcleo: reparto proporcional

Esta es **la pieza más importante de la app**. Implementar en `/lib/domain/split.ts` con tests unitarios exhaustivos (§21).

### 5.1 Cálculo del porcentaje de cada persona
```
ingresoBase(persona) = Σ ( income.amount × fx(income.currency → base) )
                        para incomes con isActive=true y period='monthly'

ingresoTotal = ingresoBase(A) + ingresoBase(B)

shareA = ingresoBase(A) / ingresoTotal        // ej. 0.40
shareB = ingresoBase(B) / ingresoTotal        // ej. 0.60
```
**Caso borde:** si `ingresoTotal == 0` → fallback a 50/50 y mostrar aviso "Agrega ingresos para calcular el reparto proporcional".

### 5.2 Reparto de un gasto compartido
```
Para un gasto compartido G de monto M (en moneda base):

switch (G.splitMode):
  proportional → cuotaA = M × shareA ; cuotaB = M × shareB
  equal        → cuotaA = M / 2     ; cuotaB = M / 2
  custom       → cuotaA = M × (G.splitShareA/100) ; cuotaB = M × (G.splitShareB/100)
  owner_100    → toda la cuota es de G.paidBy ; la otra persona = 0
```
**Redondeo:** redondear cuotaA a 2 decimales; `cuotaB = M − cuotaA` (para que sumen exactamente M y no se pierda 1 centavo).

### 5.3 Balance "quién debe a quién" (settlement)
Para un periodo, por cada gasto compartido:
```
deuda_del_no_pagador_hacia_el_pagador += cuota_del_no_pagador
```
Concretamente, definimos el **balance neto de A respecto a B**:
```
balanceA = Σ [ (lo que A debía aportar) − (lo que A efectivamente pagó) ]   sobre gastos compartidos del periodo
```
- Si `balanceA > 0` → A debe pagar `balanceA` a B.
- Si `balanceA < 0` → B debe pagar `|balanceA|` a A.

Ejemplo numérico (validar en tests):
> Ingresos: A=42 000, B=63 000 → shareA=0.40, shareB=0.60.
> Gastos compartidos del mes: 2 500 (todos pagados por A, modo proporcional).
> Cuota debida: A=1 000, B=1 500. A pagó 2 500.
> balanceA = 1 000 − 2 500 = −1 500 → **B debe 1 500 a A.** ✔️

### 5.4 Modos y overrides
- El modo por defecto viene de `Couples.splitDefaultMode`.
- Cada gasto puede sobreescribir el modo.
- Gastos `isShared=false` no entran en el reparto (son personales del `paidBy`), pero **sí** suman en los reportes personales.

### 5.5 "Modo igualdad de remanente" (feature avanzada, opcional Fase 5)
Variante donde, en vez de proporción simple, se iguala el **dinero que le queda a cada quien** tras gastos. Documentar fórmula pero marcar como opcional. No bloquear la demo por esto.

---

## 6. Multi-moneda

Implementar tras la interfaz `FxProvider` en `/lib/domain/fx.ts`.

### 6.1 Modelo
- Cada pareja tiene `baseCurrency`.
- Cada monto se guarda en su **moneda original** (`currency`) + su equivalente en base (`amountBase`) **calculado al momento de guardar** usando la tasa del día (`fxRate`, `fxDate`). Esto congela el valor histórico (no se recalcula con tasas futuras).
- Para reportes y balances se usa siempre `amountBase`.

### 6.2 Fuente de tasas: Frankfurter API
- Endpoint: `GET https://api.frankfurter.dev/v1/latest?base=USD&symbols=PEN` (sin API key).
- Histórico: `GET https://api.frankfurter.dev/v1/2026-06-25?base=USD&symbols=PEN`.
- **Caché 24h** (las tasas ECB se publican 1 vez/día hábil). Implementar con `unstable_cache(..., { revalidate: 86400, tags:['fx'] })`.
- **Fallback:** si Frankfurter no responde, usar última tasa cacheada; si no hay, usar 1:1 y marcar el monto con bandera `fxStale=true` + aviso UI.
- **Limitación:** Frankfurter cubre fiat (no cripto) y no actualiza fines de semana. Aceptable para la demo.

### 6.3 Función central
```ts
// /lib/domain/fx.ts
convert(amount: number, from: ISO, to: ISO, onDate?: Date): Promise<{ value:number; rate:number; date:string }>
```
Toda conversión pasa por aquí. Nunca convertir inline en componentes.

---

## 7. Autenticación y autorización

### 7.1 Estrategia
NextAuth (Auth.js) con **Credentials provider**. Los usuarios viven en `Users` (Notion). Sesión por **JWT** (no DB sessions, para no golpear Notion en cada request).

### 7.2 Flujo de login
1. Usuario ingresa email + contraseña.
2. Server: `usersRepo.findByEmail(email)` → compara con `bcrypt.compare(password, passwordHash)`.
3. Si ok → JWT con `{ userId, coupleId, name, avatarColor }`.
4. Middleware protege todas las rutas `/app/*` (redirige a `/login` si no hay sesión).

### 7.3 Registro / seeding de usuarios
- Para la demo, los 2 usuarios se crean con un **script de seed** (§20) o una pantalla de registro simple protegida por un `SETUP_TOKEN`.
- No exponer registro público (es demo de 1 pareja). Botón "Crear cuenta de demo" opcional que crea pareja + 2 usuarios de ejemplo.

### 7.4 Autorización
- Cada request server valida que la entidad pertenece a `session.coupleId` antes de leer/escribir. Helper `assertSameCouple(entity, session)`.
- Roles: en la demo ambos son `owner`-equivalentes. Dejar el campo `role` para el futuro.

### 7.5 Seguridad
- `passwordHash` jamás se serializa al cliente. Los mappers de repositorio tienen una versión `toPublicUser()` que lo omite.
- `NOTION_TOKEN`, `NEXTAUTH_SECRET` solo en entorno servidor.
- Rate-limit básico en login (p.ej. 5 intentos/min) para evitar fuerza bruta.

---

## 8. Sistema de diseño visual

> **Objetivo estético:** una app de finanzas que se sienta **cálida, confiable y moderna**, no un dashboard corporativo genérico ni el típico "AI purple gradient". Inspiración: la calidez de apps fintech como Monarch/Copilot Money + la claridad de Linear. Debe transmitir "esto es NUESTRO dinero, juntos".

### 8.1 Identidad
- **Nombre de marca:** **DúoFinanzas** (o el que el usuario prefiera; usar como placeholder).
- **Tono visual:** limpio, espacioso, con un toque humano. Bordes redondeados generosos (`rounded-2xl`), sombras suaves, micro-animaciones sutiles.

### 8.2 Paleta de color
Definir como variables CSS / tokens de Tailwind. **Dos colores de acento personales** (uno por miembro de la pareja) más un color de marca.

```
Marca (teal/verde azulado, confianza + dinero):
  --brand-50  #ecfdf5
  --brand-500 #10b981   (verde esmeralda principal)
  --brand-600 #059669
  --brand-700 #047857

Acentos de persona (configurables por usuario):
  Persona A → coral/ámbar:  #f59e0b
  Persona B → índigo:       #6366f1
  (set de 6 colores elegibles: emerald, amber, indigo, rose, cyan, violet)

Semánticos:
  success #10b981 · warning #f59e0b · danger #ef4444 · info #3b82f6

Neutros (modo claro):
  bg #fafaf9 (stone-50) · surface #ffffff · border #e7e5e4 · text #1c1917 · muted #78716c
Neutros (modo oscuro):
  bg #0c0a09 · surface #1c1917 · border #292524 · text #fafaf9 · muted #a8a29e
```
- **Dark mode obligatorio** vía `next-themes`. Probar contraste AA en ambos.
- Verde para "te deben / a favor", rojo para "debes / en contra", neutro para informativo. **Nunca** usar solo color para transmitir info (añadir icono/etiqueta — a11y).

### 8.3 Tipografía
- **Sans principal:** `Inter` (UI) vía `next/font`.
- **Números/montos:** fuente con cifras tabulares (`font-variant-numeric: tabular-nums`) para que las columnas de dinero alineen. Opcional usar `Geist Mono` o `JetBrains Mono` para cifras grandes del dashboard.
- Escala: `text-xs`(12) · `sm`(14) · `base`(16) · `lg`(18) · `xl`(20) · `2xl`(24) · `3xl`(30) · `4xl`(36, hero de saldo).

### 8.4 Espaciado, radios y sombras
- Grid base 4px. Padding de tarjetas `p-5`/`p-6`. Gaps `gap-4`/`gap-6`.
- Radios: inputs `rounded-xl`, tarjetas `rounded-2xl`, chips `rounded-full`.
- Sombras suaves: `shadow-sm` por defecto, `shadow-md` en hover de tarjetas interactivas. Evitar sombras duras.

### 8.5 Componentes visuales firma (lo que da personalidad)
1. **"Barra de equidad"**: una barra horizontal dividida en dos colores (A/B) que muestra visualmente el % de reparto proporcional. Aparece en el dashboard y al crear gastos. Es el elemento icónico de la app.
2. **Tarjeta de saldo "¿Quién debe a quién?"**: tarjeta grande con avatares de ambos y una flecha animada (`A → B  S/ 1 500`). Color según dirección.
3. **Avatares con color de persona**: iniciales sobre el `avatarColor` del usuario en toda la app.
4. **Anillos de progreso** para metas y presupuestos (estilo Apple Activity).
5. **Estado vacío ilustrado**: cada sección vacía muestra una ilustración/emoji + CTA claro (no pantallas en blanco).

### 8.6 Movimiento
- Transiciones 150–250ms `ease-out`. Animar entrada de listas (stagger sutil), conteo de cifras (count-up en el saldo principal), y la barra de equidad al cambiar ingresos.
- Respetar `prefers-reduced-motion`.

### 8.7 Responsive
- **Móvil-first.** Navegación inferior (bottom tab bar) en móvil con 5 destinos: Inicio · Gastos · Añadir(+) · Metas · Más. En desktop, sidebar izquierda.
- Botón flotante "+" central para añadir gasto rápido (acción más frecuente).
- Tablas → se convierten en tarjetas apiladas en móvil.

---

## 9. Mapa de pantallas y rutas

Rutas bajo App Router. Grupo `(auth)` público, grupo `(app)` protegido.

```
/login                       → Pantalla de login
/setup                       → (protegida por SETUP_TOKEN) crear pareja + usuarios demo

(app) — requieren sesión:
/                            → Dashboard / Inicio
/expenses                    → Lista de gastos (filtros, búsqueda)
/expenses/new                → Alta de gasto (modal o página)
/expenses/[id]               → Detalle/edición de gasto
/income                      → Ingresos de ambos + barra de equidad
/budgets                     → Presupuestos por categoría (mes actual)
/debts                       → Deudas y préstamos
/debts/[id]                  → Detalle de deuda (calendario de pagos)
/goals                       → Metas de ahorro
/goals/[id]                  → Detalle de meta + aportes
/recurring                   → Gastos recurrentes / suscripciones
/settlements                 → Liquidaciones (histórico + liquidar ahora)
/reports                     → Reportes y gráficos
/categories                  → Gestión de categorías
/settings                    → Ajustes (moneda base, modo de reparto, perfil, tema)
```

### 9.1 Detalle por pantalla (propósito · componentes · estados)
Para cada pantalla la IA debe implementar: estado **loading** (skeleton), **vacío** (ilustración + CTA), **error** (mensaje + reintentar), **con datos**.

- **Dashboard `/`** — *La foto del mes en 5 segundos.*
  Componentes: (a) Tarjeta "saldo entre ustedes" (quién debe a quién, botón "Liquidar"); (b) Barra de equidad con % A/B; (c) Resumen del mes: total gastado compartido, mi aporte debido vs pagado; (d) Mini-gráfico de gastos por categoría (donut); (e) Progreso de presupuestos (top 3); (f) Próximos pagos recurrentes/deudas; (g) Metas destacadas (anillos). Acción rápida "+ Gasto".

- **Gastos `/expenses`** — lista filtrable (por mes, categoría, persona, compartido/personal, moneda), búsqueda por texto, orden por fecha/monto. Cada fila: icono categoría, descripción, fecha, quién pagó (avatar), monto (en moneda original + equivalente base si difiere), badge de modo de reparto. Paginación/scroll infinito. Acción rápida añadir.

- **Alta de gasto `/expenses/new`** — formulario corto: monto + selector de moneda, descripción, categoría (con iconos), fecha (default hoy), pagado por (default usuario actual), toggle "Compartido/Personal", selector de modo de reparto (con preview de cuotas en vivo usando la barra de equidad), recibo (opcional, subida de imagen), notas. **Preview en vivo:** "Ana aporta S/ X · Luis aporta S/ Y".

- **Ingresos `/income`** — dos columnas (una por persona) con sus ingresos activos; total de cada uno en moneda base; **barra de equidad** prominente mostrando el % resultante; botón añadir ingreso. Editar ingreso recalcula el % en vivo. Histórico de ingresos inactivos colapsado.

- **Presupuestos `/budgets`** — lista de categorías con barra de progreso (gastado/límite del mes), color verde/ámbar/rojo según % consumido. Alta/edición de límite. Aviso cuando se supera.

- **Deudas `/debts`** — tarjetas por deuda con saldo actual, cuota mensual, día de pago, responsable (compartido → muestra reparto), progreso de amortización. Detalle con tabla de cuotas estimadas (amortización simple).

- **Metas `/goals`** — tarjetas con anillo de progreso, monto actual/meta, fecha objetivo, "te falta X, aporte mensual sugerido Y". Detalle: registrar aporte (con modo de contribución), histórico de aportes por persona.

- **Recurrentes `/recurring`** — lista de suscripciones/gastos fijos con frecuencia y próximo cobro. Botón "Generar gastos del mes" (materializa los `RecurringExpenses` vencidos como `Expenses`). Activar/pausar.

- **Liquidaciones `/settlements`** — botón "Liquidar mes/periodo": calcula el neto, muestra resumen ("Luis debe S/ 1 500 a Ana, sobre 23 gastos"), permite confirmar → marca gastos como `isSettled` y crea registro. Histórico de liquidaciones con estado (draft/confirmed/paid).

- **Reportes `/reports`** — selector de periodo. Gráficos: gasto total por mes (barras), por categoría (donut + tabla), aporte de cada persona en el tiempo (líneas), evolución del % de reparto, gasto compartido vs personal. Exportar a CSV (opcional).

- **Categorías `/categories`** — CRUD de categorías con icono y color, marcar tipo (shared/personal/both), archivar.

- **Ajustes `/settings`** — moneda base, modo de reparto por defecto, datos de perfil (nombre, color de persona, cambiar contraseña), tema claro/oscuro, idioma (es por defecto), "datos de demo" (sembrar/borrar datos de ejemplo).

---

## 10. Flujos de trabajo detallados

### 10.1 Onboarding (primera vez)
1. `/setup` (con `SETUP_TOKEN`) o botón "Probar demo" → crea `Couple` + 2 `Users` + categorías por defecto + (opcional) datos de ejemplo.
2. Redirige a `/income` para que ingresen sus sueldos → se calcula el % de reparto.
3. Tooltip guía: "Ahora añade tu primer gasto compartido".

### 10.2 Registrar un gasto compartido (flujo más usado)
1. Tap en "+" → formulario.
2. Ingresa monto + moneda; si moneda ≠ base, el server calcula `amountBase`, `fxRate`, `fxDate`.
3. Elige categoría, fecha, pagado por.
4. Modo de reparto (default = `Couples.splitDefaultMode`). Preview en vivo de cuotas.
5. Guardar → optimistic update en la lista + toast "Gasto añadido". Se invalida la caché (`revalidateTag('expenses')`, `revalidateTag('dashboard')`).

### 10.3 Liquidación (settlement)
1. Usuario abre `/settlements` → "Liquidar".
2. Server recalcula `balanceA` sobre gastos compartidos `isSettled=false` del periodo.
3. Muestra "X debe Y a Z". Usuario confirma.
4. Server crea `Settlement` (status confirmed), marca los gastos incluidos con `isSettled=true` y `settlement=ID`.
5. El saldo del dashboard vuelve a ~0. Histórico queda registrado.

### 10.4 Materializar recurrentes
1. En `/recurring`, botón "Generar pendientes" (manual) **y** una **Netlify Scheduled Function** que lo ejecuta automáticamente (ej. diaria `0 6 * * *` UTC). Ver §23.4. La función llama a la misma lógica de dominio `runRecurring()`; no duplicar lógica.
2. Para cada `RecurringExpense` con `nextRun <= hoy` y `isActive`: crea un `Expense` con sus datos, avanza `nextRun` a la siguiente fecha según `frequency`.
3. Idempotencia: no duplicar si ya existe un Expense con ese `recurringSource` + mes.

### 10.5 Cambio de ingresos → recálculo de equidad
- Al crear/editar/desactivar un ingreso, recalcular `shareA/shareB` y reflejarlo en la barra de equidad. Los gastos ya guardados con `proportional` **no se recalculan retroactivamente** por defecto (se respeta el % del momento del settlement); ofrecer toggle "recalcular gastos no liquidados con el nuevo %".

---

## 11. Catálogo de features (priorizado)

### 11.1 Core (Fase 1–3, imprescindibles para la demo)
- Auth (login, sesión, protección de rutas).
- Gestión de ingresos + cálculo de % proporcional + barra de equidad.
- CRUD de gastos (compartidos y personales) con multi-moneda.
- Reparto proporcional / igual / custom / 100% por gasto, con preview.
- Dashboard con saldo "quién debe a quién".
- Liquidaciones.
- Categorías (CRUD + semilla).
- Presupuestos por categoría.

### 11.2 Importantes (Fase 4)
- Deudas/préstamos con responsabilidad compartida.
- Metas de ahorro con aportes.
- Gastos recurrentes + materialización.
- Reportes con gráficos.
- Subida de recibos (file upload Notion).
- Gastos **privados** (visibles solo para el dueño): respetar privacidad opcional; el otro ve el total pero no el detalle (configurable). *Marcar como opcional si añade complejidad.*

### 11.3 Avanzadas / nice-to-have (Fase 5, no bloquean demo)
- PWA instalable + offline básico (cache de lecturas).
- Notificaciones de recordatorio (pagos próximos) — vía email o in-app.
- Exportar a CSV/Excel.
- Modo "igualdad de remanente" (§5.5).
- Insights/consejos automáticos ("este mes gastaron 20% más en restaurantes").
- OCR de recibos (fuera de alcance salvo que sobre tiempo).

---

## 12. Catálogo de componentes UI reutilizables

Construir en `/components` sobre shadcn/ui. Mínimo:
- `MoneyAmount` — formatea monto + moneda (Intl.NumberFormat), cifras tabulares, color opcional (positivo/negativo), tooltip con equivalente en base.
- `EquityBar` — la barra de equidad A/B (recibe shareA, shareB, colores).
- `PersonAvatar` — iniciales + color de persona, tamaños.
- `BalanceCard` — tarjeta "quién debe a quién".
- `CategoryBadge` — icono + color + nombre.
- `SplitModeSelector` — selector de modo con preview de cuotas.
- `CurrencySelect` — combo de monedas ISO con bandera/símbolo.
- `ProgressRing` — anillo de progreso (metas/presupuestos).
- `StatCard` — métrica con título, valor, delta y tendencia.
- `EmptyState` — ilustración + título + CTA.
- `DataTable` — tabla→tarjetas responsive con orden/filtro.
- `MonthPicker` / `PeriodPicker`.
- `ChartDonut`, `ChartBars`, `ChartLines` (wrappers de Recharts con tema).
- `ConfirmDialog`, `FormField` (RHF + Zod), `PageHeader`, `BottomNav`, `Sidebar`.

> Todos los componentes con estados loading/empty/error y accesibles (roles ARIA, foco visible, navegables por teclado).

---

## 13. API interna / contratos (Server Actions & Route Handlers)

Usar **Server Actions** para mutaciones desde formularios y **Route Handlers** (`/app/api/*`) para lo invocable externamente (cron) o por React Query. Validar TODO con Zod en el borde.

Ejemplos de acciones (firmas):
```ts
// gastos
createExpense(input: ExpenseInput): Promise<Expense>
updateExpense(id: string, patch: Partial<ExpenseInput>): Promise<Expense>
deleteExpense(id: string): Promise<void>
listExpenses(filter: ExpenseFilter): Promise<Paginated<Expense>>

// ingresos / equidad
upsertIncome(input: IncomeInput): Promise<Income>
getEquity(coupleId: string): Promise<{ shareA:number; shareB:number; incomeA:number; incomeB:number }>

// liquidaciones
previewSettlement(period: Period): Promise<SettlementPreview>
confirmSettlement(period: Period): Promise<Settlement>

// recurrentes
runRecurring(coupleId: string, asOf: Date): Promise<{ created: number }>

// fx
getRate(from: ISO, to: ISO, onDate?: Date): Promise<RateResult>
```
**Contrato de error uniforme:** `{ ok:false, code, message }` / `{ ok:true, data }`. Mapear 429 de Notion a "Servicio ocupado, reintentando…" y reintentar transparentemente.

---

## 14. Caché, rate limiting y resiliencia

- **Lecturas:** envolver en `unstable_cache` con `tags` por entidad (`expenses`, `income`, `dashboard`, `budgets`, etc.). `revalidate` razonable (p.ej. 60s) + invalidación por tag en mutaciones.
- **Escrituras a Notion:** cola serializada con `p-limit(2)` y **backoff exponencial** ante 429/529 respetando `Retry-After`. Helper `notionWithRetry(fn)`.
- **Optimistic UI:** las mutaciones actualizan la UI antes de confirmar; si falla, rollback + toast de error.
- **`queryAll()`**: helper que pagina hasta agotar `has_more`.
- **Idempotencia** en recurrentes y settlements (no duplicar).
- **Degradación elegante:** si Notion cae, mostrar datos cacheados + banner "modo solo lectura".

---

## 15. Estados, accesibilidad e i18n

- **Estados:** cada vista con skeleton de carga, vacío con CTA, error con reintento.
- **A11y (WCAG AA):** contraste suficiente, foco visible, navegación por teclado, `aria-label` en iconos-botón, no depender solo de color (usar icono + texto en positivo/negativo), `prefers-reduced-motion`.
- **i18n:** textos en español centralizados (archivo de strings `/lib/i18n/es.ts`) para facilitar futura traducción. Formateo de moneda/fecha con `Intl` según locale de la pareja.
- **Formato de dinero:** `Intl.NumberFormat(locale, { style:'currency', currency })`. Cifras tabulares en tablas.

---

## 16. Seguridad y privacidad

- Token Notion y secretos solo en servidor (§2.4).
- Contraseñas con bcrypt; nunca devolver `passwordHash`.
- Autorización por `coupleId` en cada operación.
- Validación Zod en todas las entradas (evita inyección de filtros raros a Notion).
- Rate-limit en login.
- Recibos: validar tipo/tamaño antes de subir; no confiar en el nombre de archivo.
- `.env` fuera de git; documentar `.env.example`.

---

## 17. Plan de implementación por fases

> Cada fase termina con criterios de aceptación verificables. Implementar en orden. Hacer commits pequeños. Escribir tests de la lógica financiera **antes** de la UI (TDD para `/lib/domain`).

### Fase 0 — Setup (cimientos)
- Inicializar Next.js + TS strict + Tailwind + shadcn/ui + ESLint/Prettier.
- Configurar `next-themes`, fuentes (`Inter`), tokens de color (§8.2).
- Crear estructura de carpetas (§18) y `.env.example` (§19).
- Implementar cliente Notion (`/lib/notion/client.ts`) con `notionWithRetry` y `queryAll`.
- **Aceptación:** app corre, dark/light funciona, lint pasa, se conecta a Notion y lista una DB de prueba.

### Fase 1 — Datos + dominio + FX (sin UI bonita)
- Definir tipos de entidad (`/lib/types`) y schemas Zod.
- Implementar repositorios (`/lib/repos/*`) con mappers Notion↔entidad.
- Implementar `/lib/domain/split.ts`, `money.ts`, `fx.ts`, `couple.ts` con **tests Vitest** (incluido el ejemplo de §5.3).
- Script de seed (§20): crea Couple, 2 Users, categorías, datos de ejemplo.
- **Aceptación:** tests de dominio en verde (split, balance, redondeo, fx fallback). Seed crea datos visibles en Notion.

### Fase 2 — Auth + shell de la app
- NextAuth Credentials sobre `Users`, middleware de protección, login, logout.
- Layout protegido: Sidebar (desktop) + BottomNav (móvil) + header con tema.
- **Aceptación:** login funciona, rutas `/app/*` protegidas, sesión persiste, logout limpia.

### Fase 3 — Core financiero (MVP usable)
- Ingresos + `EquityBar` + cálculo de %.
- CRUD de gastos con multi-moneda, modos de reparto y preview.
- Dashboard con `BalanceCard`, resumen del mes, donut por categoría.
- Categorías (CRUD + semilla).
- Presupuestos por categoría.
- Liquidaciones (preview + confirmar).
- **Aceptación:** flujo completo: ingresar sueldos → añadir gastos en 2 monedas → ver saldo correcto → liquidar → saldo a 0. Cifras cuadran con los tests.

### Fase 4 — Features importantes
- Deudas/préstamos (CRUD + amortización + responsabilidad compartida).
- Metas + aportes.
- Recurrentes + materialización (Route Handler).
- Reportes con gráficos (Recharts).
- Subida de recibos (Notion file upload).
- **Aceptación:** cada sección funcional con estados vacío/carga/error; gráficos reflejan datos reales; recurrentes generan gastos sin duplicar.

### Fase 5 — Pulido y avanzadas (si hay tiempo)
- PWA + offline básico, exportar CSV, insights, gastos privados, `prefers-reduced-motion`, micro-animaciones, count-up del saldo.
- Pase de a11y y de rendimiento (Lighthouse > 90).
- **Aceptación:** Lighthouse PWA/Best Practices/Accessibility altos; demo "presentable".

### Fase 6 — Despliegue en Netlify (entrega final)
- Configurar `netlify.toml`, plugin `@netlify/plugin-nextjs`, variables de entorno en Netlify, Scheduled Function para recurrentes. Ver §23 para el detalle completo.
- **Aceptación:** la app queda **publicada y accesible en una URL de Netlify**, con login demo funcional, FX operativo, y la Scheduled Function de recurrentes programada. Build de producción sin errores.

---

## 18. Estructura de carpetas

```
/app
  /(auth)/login/page.tsx
  /(auth)/setup/page.tsx
  /(app)/layout.tsx           # shell protegido (sidebar/bottomnav)
  /(app)/page.tsx             # dashboard
  /(app)/expenses/...
  /(app)/income/page.tsx
  /(app)/budgets/page.tsx
  /(app)/debts/...
  /(app)/goals/...
  /(app)/recurring/page.tsx
  /(app)/settlements/page.tsx
  /(app)/reports/page.tsx
  /(app)/categories/page.tsx
  /(app)/settings/page.tsx
  /api/cron/recurring/route.ts
  /api/fx/route.ts
/components
  /ui                         # shadcn
  /finance                    # MoneyAmount, EquityBar, BalanceCard, ...
  /charts
  /layout                     # Sidebar, BottomNav, PageHeader
/lib
  /notion/client.ts           # cliente + retry + queryAll
  /repos                      # usersRepo, expensesRepo, ...
  /domain                     # split.ts, money.ts, fx.ts, couple.ts, settlement.ts
  /types                      # entidades + Zod schemas
  /cache                      # wrappers unstable_cache/tags
  /auth                       # config NextAuth
  /i18n/es.ts                 # strings
  /utils
/actions                      # server actions agrupadas por dominio
/scripts/seed.ts              # crea DBs/datos de ejemplo
/netlify/functions/recurring.ts  # Scheduled Function (cron) → llama runRecurring()
/tests                        # vitest (dominio) + playwright (e2e)
netlify.toml                  # config de build + plugin Next.js + schedule
.env.example
```

> **Nota:** la lógica de recurrentes vive en `/lib/domain` y se expone tanto por el Route Handler `/api/cron/recurring` (invocación manual/protegida) como por la Scheduled Function de Netlify (`/netlify/functions/recurring.ts`). Ambos invocan la **misma** función `runRecurring()`; no duplicar lógica.

---

## 19. Variables de entorno (`.env.example`)
```
# Notion
NOTION_TOKEN=secret_xxx
NOTION_DB_COUPLES=...
NOTION_DB_USERS=...
NOTION_DB_INCOMES=...
NOTION_DB_CATEGORIES=...
NOTION_DB_EXPENSES=...
NOTION_DB_BUDGETS=...
NOTION_DB_DEBTS=...
NOTION_DB_GOALS=...
NOTION_DB_GOAL_CONTRIBUTIONS=...
NOTION_DB_RECURRING=...
NOTION_DB_SETTLEMENTS=...
NOTION_DB_EXCHANGE_RATES=...   # opcional

# Auth
NEXTAUTH_SECRET=...
# En local: http://localhost:3000 · En producción: la URL de Netlify (https://<sitio>.netlify.app o dominio propio)
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true            # necesario en Netlify (Auth.js confía en el host del proxy)
SETUP_TOKEN=un-token-largo-para-proteger-/setup

# App
NEXT_PUBLIC_APP_NAME=DúoFinanzas
DEFAULT_BASE_CURRENCY=PEN

# Cron / Scheduled Function
CRON_SECRET=otro-token-para-proteger-/api/cron/recurring
```

> **Para la IA:** documenta en el README cómo (1) crear la integración en Notion (https://www.notion.so/my-integrations), (2) compartir la página contenedora con la integración, (3) crear las databases con las propiedades de §4 (o ejecutar `scripts/seed.ts` que las crea por API), y (4) copiar los IDs a `.env`.
>
> **En Netlify**, todas estas variables se cargan en **Site settings → Environment variables** (no se suben al repo). `NEXTAUTH_URL` debe apuntar a la URL final del sitio Netlify. Marca `NOTION_TOKEN`, `NEXTAUTH_SECRET`, `CRON_SECRET` y `passwordHash`-relacionados como **secretos**. Ver §23.

---

## 20. Setup y seeding de Notion

Crear `scripts/seed.ts` (ejecutable con `tsx`/`ts-node`) que:
1. Crea (o referencia) la página contenedora "DúoFinanzas — DB".
2. Crea cada database con sus propiedades exactas (§4) vía `notion.databases.create`.
3. Imprime los IDs para pegarlos en `.env`.
4. Crea 1 `Couple`, 2 `Users` (con contraseñas demo hasheadas, ej. `ana@demo.app` / `luis@demo.app` ambos password `demo1234`), `avatarColor` distintos.
5. Crea categorías por defecto:
   `Alquiler 🏠`, `Supermercado 🛒`, `Servicios (luz/agua/internet) 💡`, `Restaurantes 🍽️`, `Transporte 🚗`, `Salud 🩺`, `Entretenimiento 🎬`, `Suscripciones 📺`, `Mascotas 🐾`, `Hogar 🛋️`, `Personal 👤`, `Otros 📦`.
6. (Opcional) Datos de ejemplo: ingresos (A=4200, B=6300 en base), ~15 gastos del mes en 2 monedas, 1 deuda, 1 meta, 2 recurrentes.

> Si crear DBs por API resultara limitado, alternativa: el usuario duplica un **template de Notion** y solo pega los IDs. Documentar ambas vías.

---

## 21. Testing

### 21.1 Unit (Vitest) — OBLIGATORIO para `/lib/domain`
- `split.ts`: proporcional/igual/custom/100%, redondeo que suma exacto, caso ingreso total 0 → 50/50.
- `settlement.ts`: balance neto con múltiples gastos y pagadores mezclados; el ejemplo de §5.3 debe pasar.
- `fx.ts`: conversión, caché, fallback a 1:1 con bandera `stale`.
- `money.ts`: formateo y redondeo a 2 decimales sin errores de float.

### 21.2 E2E (Playwright) — flujos críticos
- Login → añadir gasto → ver saldo correcto → liquidar → saldo 0.
- Cambiar ingreso → barra de equidad y cuotas se actualizan.

### 21.3 Manual / demo
- Checklist de QA visual: dark/light, móvil/desktop, estados vacío/carga/error en cada pantalla.

---

## 22. Definition of Done (por feature)
Una feature está "lista" cuando:
1. Funciona en móvil y desktop, claro y oscuro.
2. Tiene estados loading/empty/error.
3. Valida entradas (Zod) y maneja errores de Notion (retry/toast).
4. No expone secretos ni `passwordHash`.
5. Respeta el `coupleId` de la sesión.
6. Si toca lógica financiera, tiene tests en verde.
7. Las cifras mostradas indican moneda y, si convertidas, tasa/fecha.

---

## 23. Despliegue en Netlify (entrega final)

> **Objetivo:** la app termina **publicada en Netlify**. El LLM ejecutor ya dispone de un **token de acceso a Netlify**, así que puede crear el sitio, configurar variables y desplegar vía **Netlify CLI** (`netlify`) o la API de Netlify sin pasos manuales del usuario.

### 23.1 Compatibilidad Next.js ↔ Netlify
- Netlify soporta Next.js (App Router, RSC, **Server Actions**, Route Handlers, ISR/caché) mediante el **Next.js Runtime v5** (`@netlify/plugin-nextjs`), que se activa automáticamente al detectar Next.js. No requiere `output: 'export'` ni `standalone`; **no** convertir la app a estática (necesitamos el servidor para Notion/auth/FX).
- La caché de Next.js (`unstable_cache` / `revalidateTag`) funciona sobre el runtime de Netlify. Mantener la estrategia de §14 tal cual.
- **No** exponer `NOTION_TOKEN` como variable `NEXT_PUBLIC_*`: en Netlify las env vars de servidor solo están disponibles en funciones/SSR, nunca en el bundle del cliente (se respeta la regla de oro §2.4).

### 23.2 `netlify.toml` (en la raíz del repo)
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Scheduled Function: materializa recurrentes cada día 06:00 UTC
[functions."recurring"]
  schedule = "0 6 * * *"
```

### 23.3 Variables de entorno en Netlify
- Cargar **todas** las de §19 en **Site settings → Environment variables** (o vía `netlify env:set` / `netlify env:import .env`).
- `NEXTAUTH_URL` = URL final del sitio (p.ej. `https://duofinanzas.netlify.app`). Setear **después** del primer deploy si el subdominio se decide entonces, y volver a desplegar.
- `AUTH_TRUST_HOST=true` (Auth.js detrás del proxy de Netlify).
- Marcar `NOTION_TOKEN`, `NEXTAUTH_SECRET`, `CRON_SECRET` como **secret**.

### 23.4 Cron de recurrentes (Scheduled Function)
- Archivo `/netlify/functions/recurring.ts` exportando un handler con `export const config = { schedule: "0 6 * * *" }` (o declarado en `netlify.toml` como arriba — usar **una** de las dos vías, no ambas).
- El handler: valida un secreto interno, recorre todas las parejas y llama a `runRecurring(coupleId, today)` de `/lib/domain`. **Reutiliza la lógica**, no la reimplementa.
- Las Scheduled Functions corren en **UTC** y están disponibles en todos los planes de Netlify.
- Mantener también el Route Handler `/api/cron/recurring` protegido por `CRON_SECRET` para disparo manual/debug.

### 23.5 Pasos de despliegue (para el LLM ejecutor, con token Netlify)
1. `npm run build` local OK (sin errores de tipos/lint).
2. Crear/enlazar sitio: `netlify init` o `netlify link` (con el token ya configurado en `NETLIFY_AUTH_TOKEN`).
3. Cargar env vars: `netlify env:import .env` (sin secretos de prueba) o `netlify env:set CLAVE valor`.
4. Desplegar a producción: `netlify deploy --build --prod`.
5. Setear `NEXTAUTH_URL` con la URL resultante y re-desplegar si hizo falta.
6. Verificar post-deploy: login demo, alta de gasto, conversión FX, y que la Scheduled Function aparece en **Functions → Scheduled**.
7. Entregar al usuario la **URL pública** + credenciales demo.

### 23.6 Checklist de "demo desplegada"
- [ ] Sitio accesible por HTTPS en URL de Netlify.
- [ ] Login con cuenta demo funciona en producción.
- [ ] Gastos, ingresos, dashboard y liquidación operan contra Notion en producción.
- [ ] FX (Frankfurter) responde y cachea.
- [ ] Scheduled Function de recurrentes registrada y ejecutable.
- [ ] Ningún secreto expuesto en el cliente (revisar el bundle/Network).

---

## 24. Roadmap futuro (post-demo) y migración fuera de Notion
- **Migración de backend:** como toda la lógica vive en `/lib/repos` y `/lib/domain`, migrar a **Supabase/Postgres + Prisma** implica reescribir solo `/lib/repos/*` y la auth (pasar a Supabase Auth o mantener NextAuth con adaptador DB). El resto del frontend no cambia.
- Integración bancaria (Plaid/Belvo) para importar transacciones.
- App móvil (React Native) reusando la capa de dominio.
- Multi-pareja real + planes de pago.
- IA: categorización automática, OCR de recibos, consejos financieros, proyecciones.
- Notificaciones push y recordatorios programados.

---

## 25. Notas finales para la IA ejecutora
1. **No rompas la regla de oro** (§2.4): Notion solo desde el servidor.
2. **Implementa primero el dominio con tests** (split/settlement/fx) — es el corazón y lo que da credibilidad a la demo.
3. **Respeta los límites de Notion** con caché + retry + concurrencia limitada desde el inicio; meterlos después es doloroso.
4. **Cuida el diseño visual** (§8): la barra de equidad y la tarjeta de saldo son la firma de la app; que se vean excelentes.
5. **Móvil-first.** La acción más común (añadir gasto) debe estar a un toque.
6. Cuando una decisión no esté en este plan, **prioriza simplicidad y la regla YAGNI**, y deja un `// TODO:` documentado.
7. Entrega un **README** con setup paso a paso (Notion, env, seed, run y **deploy a Netlify**) y una cuenta demo lista para iniciar sesión.
8. **Cierra desplegando en Netlify** (§23): la entrega final no es el repo, es la **URL pública funcionando**. Usa el token de Netlify ya disponible; no pidas pasos manuales al usuario salvo confirmar el subdominio.

---

## Apéndice A — Fuentes consultadas para este plan
- Notion API — Request limits (3 req/s, payloads): https://developers.notion.com/reference/request-limits
- Notion API — Working with files and media (Direct Upload `/v1/file_uploads`, 5 MiB free): https://developers.notion.com/guides/data-apis/working-with-files-and-media
- Notion API — Filtros de consulta de bases de datos: https://developers.notion.com/reference/post-database-query-filter
- Frankfurter — API de tipos de cambio gratis sin key (ECB): https://frankfurter.dev/
- Reparto proporcional de gastos por ingreso (fórmula y ejemplo): https://adamhagerman.com/share-expenses-living-together/ y https://www.fairsharecalculator.com/
- Comparativa de apps de finanzas para parejas (Splitwise vs Honeydue, features): https://smartfinancepick.com/splitwise-vs-honeydue-splitting-bills-for-couples/ y https://www.honeydue.com/
- Netlify — Next.js Runtime v5 (App Router, Server Actions, ISR): https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify — Scheduled Functions (cron): https://docs.netlify.com/build/functions/scheduled-functions/
- Notion — límites de archivos por plan (Plus ~5 GB) y subida multi-part por API: https://developers.notion.com/docs/sending-larger-files
```

