import { unstable_cache } from "next/cache";

export interface RateResult {
  value: number;
  rate: number;
  date: string;
}

const fetchRate = async (from: string, to: string, date?: string): Promise<number> => {
  if (from === to) return 1;
  const endpoint = date ? `https://api.frankfurter.dev/v1/${date}` : `https://api.frankfurter.dev/v1/latest`;
  const url = `${endpoint}?base=${from}&symbols=${to}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("FX API Error");
    const data = await res.json();
    return data.rates[to];
  } catch (error) {
    console.error(`Failed to fetch FX rate for ${from} to ${to}:`, error);
    return 1; // Fallback to 1:1 if API fails
  }
};

export const getRate = unstable_cache(
  async (from: string, to: string, date?: string) => {
    return await fetchRate(from, to, date);
  },
  ['fx-rate'],
  { revalidate: 86400, tags: ['fx'] }
);

export async function convert(amount: number, from: string, to: string, onDate?: Date): Promise<RateResult> {
  const dateStr = onDate ? onDate.toISOString().split('T')[0] : undefined;
  const rate = await getRate(from, to, dateStr);
  return {
    value: amount * rate,
    rate,
    date: dateStr || new Date().toISOString().split('T')[0],
  };
}
