/**
 * Tipos de cambio.
 *  - Frankfurter (BCE) NO publica PEN, así que USD↔PEN usa la tasa manual de la pareja
 *    (`couple.fxRate`, configurable en Ajustes). Pares con PEN distintos a USD se
 *    triangulan vía USD.
 *  - Otros pares (USD↔EUR) se consultan a Frankfurter y se cachean 24 h en memoria.
 *  - Si la API falla se LANZA un error (antes caía silenciosamente a 1:1 y guardaba
 *    montos base incorrectos).
 */
const FRANKFURTER = "https://api.frankfurter.dev/v1/latest";
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { rate: number; at: number }>();

async function fetchMarketRate(from: string, to: string): Promise<number> {
  const key = `${from}->${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rate;

  const res = await fetch(`${FRANKFURTER}?base=${from}&symbols=${to}`);
  if (!res.ok) throw new Error(`No se pudo obtener el tipo de cambio ${from}→${to}.`);
  const data = await res.json();
  const rate = Number(data?.rates?.[to]);
  if (!rate) throw new Error(`Tipo de cambio ${from}→${to} no disponible.`);
  cache.set(key, { rate, at: Date.now() });
  return rate;
}

/** Tasa from→to. `usdPen` = cuántos PEN vale 1 USD (tasa manual de la pareja). */
export async function getRate(from: string, to: string, usdPen: number): Promise<number> {
  if (from === to) return 1;
  if (from === "USD" && to === "PEN") return usdPen;
  if (from === "PEN" && to === "USD") return 1 / usdPen;
  if (to === "PEN") return (await fetchMarketRate(from, "USD")) * usdPen;
  if (from === "PEN") return (1 / usdPen) * (await fetchMarketRate("USD", to));
  return fetchMarketRate(from, to);
}

/**
 * Conversión síncrona para cálculos de UI (equity). Solo conoce USD↔PEN; para otras
 * monedas devuelve el monto sin convertir.
 */
export function convertSync(amount: number, from: string, to: string, usdPen: number): number {
  if (from === to) return amount;
  if (from === "USD" && to === "PEN") return amount * usdPen;
  if (from === "PEN" && to === "USD") return amount / usdPen;
  return amount;
}
