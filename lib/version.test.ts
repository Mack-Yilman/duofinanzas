import { describe, it, expect } from "vitest";
import { isGreater, parse, hasChangelogEntry } from "../scripts/check-version.mjs";

describe("versionado obligatorio", () => {
  it("compara SemVer correctamente", () => {
    expect(isGreater("1.0.1", "1.0.0")).toBe(true);
    expect(isGreater("1.1.0", "1.0.9")).toBe(true);
    expect(isGreater("2.0.0", "1.9.9")).toBe(true);
    expect(isGreater("1.0.0", "1.0.0")).toBe(false);
    expect(isGreater("1.0.0", "1.0.1")).toBe(false);
  });

  it("rechaza versiones inválidas", () => {
    expect(() => parse("v1.0")).toThrow();
  });

  it("detecta la entrada del CHANGELOG", () => {
    expect(hasChangelogEntry("# Cambios\n## [1.2.0] - 2026-11-05", "1.2.0")).toBe(true);
    expect(hasChangelogEntry("## [1.1.0]", "1.2.0")).toBe(false);
  });
});
