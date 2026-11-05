/** Validación y compresión de constancias en el navegador. */
export const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"] as const;
/** Imágenes antes de comprimir (se suben ≤ ~400 KB). */
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
/** PDF (boletas electrónicas): se suben tal cual, sin compresión. El bucket acepta hasta 3 MB. */
export const RECEIPT_PDF_MAX_BYTES = 2 * 1024 * 1024;
/** Lado mayor máximo: suficiente para leer un voucher y ~4× menos píxeles que una foto de móvil. */
const MAX_SIDE = 1280;
/** Calidades de compresión: se prueba la primera y, si el archivo sigue siendo grande, la segunda. */
export const RECEIPT_QUALITIES = [0.72, 0.6] as const;
/** Objetivo de tamaño por constancia (ahorra Storage y transferencia del plan Free). */
export const RECEIPT_TARGET_BYTES = 400 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export const isPdfType = (type: string) => type === "application/pdf";

/** Devuelve un mensaje de error o null si el archivo es aceptable. */
export function validateReceipt(file: { type: string; size: number }): string | null {
  if (!RECEIPT_TYPES.includes(file.type as (typeof RECEIPT_TYPES)[number])) {
    return "Formato no permitido. Usa JPG, PNG, WEBP, HEIC o PDF.";
  }
  if (file.size <= 0) return "El archivo está vacío.";
  if (isPdfType(file.type) && file.size > RECEIPT_PDF_MAX_BYTES) return "El PDF supera 2 MB.";
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
 * Reduce a máx. 1280 px y re-codifica a WebP o JPEG (calidad 0,72; 0,6 si pasa de 400 KB).
 * Re-codificar en canvas elimina los metadatos EXIF (incluida la ubicación GPS). Si el navegador no puede
 * decodificar el formato (p. ej. HEIC fuera de Safari) se RECHAZA: subir el original filtraría el EXIF/GPS.
 * Los PDF se suben sin cambios tras comprobar su firma `%PDF-` (no basta con el tipo que declara el navegador).
 */
export async function compressReceipt(file: File): Promise<{ blob: Blob; type: string; ext: string }> {
  if (isPdfType(file.type)) {
    const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (!isPdfSignature(head)) throw new Error("El archivo no es un PDF válido.");
    return { blob: file, type: "application/pdf", ext: "pdf" };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    // WebP primero; JPEG si el navegador no codifica WebP (Safari antiguo).
    for (const type of ["image/webp", "image/jpeg"] as const) {
      let best: Blob | null = null;
      for (const q of RECEIPT_QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
        if (!blob || blob.type !== type) break; // formato no soportado al codificar
        best = blob;
        if (blob.size <= RECEIPT_TARGET_BYTES) break;
      }
      if (best) return { blob: best, type, ext: extensionFor(type) };
    }
  } catch {
    // formato no decodificable en este navegador
  }
  throw new Error("No se pudo procesar la imagen en este navegador. Conviértela a JPG o PNG e inténtalo de nuevo.");
}

/** Los PDF empiezan por los bytes `%PDF-`. */
export function isPdfSignature(head: Uint8Array): boolean {
  return [0x25, 0x50, 0x44, 0x46, 0x2d].every((b, i) => head[i] === b);
}
