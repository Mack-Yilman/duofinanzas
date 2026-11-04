import { describe, it, expect } from "vitest";
import { getRate, convertSync } from "./fx";

describe("fx", () => {
  it("usa la tasa manual para USD↔PEN sin llamar a la API", async () => {
    expect(await getRate("USD", "PEN", 3.75)).toBe(3.75);
    expect(await getRate("PEN", "USD", 4)).toBe(0.25);
    expect(await getRate("PEN", "PEN", 4)).toBe(1);
  });

  it("convierte de forma síncrona USD→PEN para el equity", () => {
    expect(convertSync(100, "USD", "PEN", 3.8)).toBeCloseTo(380);
    expect(convertSync(100, "PEN", "PEN", 3.8)).toBe(100);
  });
});
