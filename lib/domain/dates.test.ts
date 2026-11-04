import { describe, it, expect } from "vitest";
import { parseLocalDate, toDateString } from "./dates";

describe("dates", () => {
  it("parsea YYYY-MM-DD en hora local (sin desfase de zona horaria)", () => {
    const d = parseLocalDate("2026-03-01");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(1);
  });

  it("ida y vuelta conserva el día", () => {
    expect(toDateString(parseLocalDate("2025-12-31"))).toBe("2025-12-31");
  });
});
