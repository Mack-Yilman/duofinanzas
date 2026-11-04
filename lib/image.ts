/** Validación y compresión de constancias en el navegador. */
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Devuelve un mensaje de error o null si el archivo es aceptable. */
export function validateReceipt(file: { type: string; size: number }): string | null {
  if (!RECEIPT_TYPES.includes(file.type as (typeof RECEIPT_TYPES)[number])) {
    return "Formato no permitido. Usa JPG, PNG, WEBP o HEIC.";
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (file.size > RECEIPT_MAX_BYTES) return "La imagen supera 5 MB.";
  return null;
}

export function extensionFor(type: string) {
  return EXT[type] ?? "jpg";
}

/** Escala para que el lado mayor no supere `max`, sin agrandar. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Reduce a máx. 1600 px y re-codifica a WebP. Re-codificar en canvas elimina los
 * metadatos EXIF (incluida la ubicación GPS). Si el navegador no puede decodificar
 * el formato (p. ej. HEIC fuera de Safari), se sube el original.
 */
export async function compressReceipt(file: File): Promise<{ blob: Blob; type: string; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
    if (blob && blob.type === "image/webp") return { blob, type: "image/webp", ext: "webp" };
  } catch {
    // formato no decodificable en este navegador
  }
  return { blob: file, type: file.type, ext: extensionFor(file.type) };
}
