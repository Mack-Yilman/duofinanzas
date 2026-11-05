import { describe, it, expect } from "vitest";
import { dueOccurrences, firstOccurrence, MAX_CATCH_UP } from "./recurring";
import { toDateString } from "./dates";

const s = (d: Date) => toDateString(d);

describe("gastos recurrentes", () => {
  it("primera fecha: este mes si aún no pasó, si no el siguiente", () => {
    expect(s(firstOccurrence(10, new Date(2026, 10, 5)))).toBe("2026-11-10");
    expect(s(firstOccurrence(10, new Date(2026, 10, 10)))).toBe("2026-11-10");
    expect(s(firstOccurrence(10, new Date(2026, 10, 11)))).toBe("2026-12-10");
  });

  it("devuelve las fechas vencidas y la siguiente (cruza el año)", () => {
    const { due, next } = dueOccurrences(new Date(2026, 10, 15), 15, new Date(2027, 0, 20));
    expect(due.map(s)).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
    expect(s(next)).toBe("2027-02-15");
  });

  it("nada vence antes de la fecha", () => {
    const { due, next } = dueOccurrences(new Date(2026, 10, 15), 15, new Date(2026, 10, 14));
    expect(due).toEqual([]);
    expect(s(next)).toBe("2026-11-15");
  });

  it("limita la recuperación a MAX_CATCH_UP", () => {
    const { due } = dueOccurrences(new Date(2020, 0, 1), 1, new Date(2026, 0, 1));
    expect(due).toHaveLength(MAX_CATCH_UP);
    expect(s(due[due.length - 1])).toBe("2026-01-01");
  });
});
