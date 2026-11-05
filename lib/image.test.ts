import { describe, it, expect } from "vitest";
import { validateReceipt, fitWithin, extensionFor, isPdfSignature } from "./image";

describe("constancias", () => {
  it("acepta imágenes permitidas de hasta 5 MB", () => {
    expect(validateReceipt({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(validateReceipt({ type: "image/heic", size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("rechaza tipos no permitidos, vacíos y demasiado grandes", () => {
    expect(validateReceipt({ type: "image/svg+xml", size: 10 })).toMatch(/Formato/);
    expect(validateReceipt({ type: "image/png", size: 0 })).toMatch(/vacío/);
    expect(validateReceipt({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });

  it("acepta PDF de hasta 2 MB y comprueba su firma", () => {
    expect(validateReceipt({ type: "application/pdf", size: 100 * 1024 })).toBeNull();
    expect(validateReceipt({ type: "application/pdf", size: 3 * 1024 * 1024 })).toMatch(/2 MB/);
    expect(isPdfSignature(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(isPdfSignature(new TextEncoder().encode("<html>"))).toBe(false);
    expect(extensionFor("application/pdf")).toBe("pdf");
  });

  it("escala sin agrandar y respeta la proporción", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 5000)).toEqual({ width: 256, height: 1280 });
  });

  it("asigna extensión por tipo", () => {
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/jpeg")).toBe("jpg");
  });
});
