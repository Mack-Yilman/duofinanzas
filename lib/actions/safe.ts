import { toast } from "sonner";
import { queryClient } from "../query-client";

/**
 * Envuelve una acción de formulario: muestra los errores como toast (en vez de romper
 * la página) e invalida la caché de datos al terminar con éxito.
 */
export function action<A extends unknown[]>(fn: (...args: A) => Promise<void | string>, successMsg?: string) {
  return async (...args: A) => {
    try {
      const msg = await fn(...args);
      await queryClient.invalidateQueries();
      const text = typeof msg === "string" ? msg : successMsg;
      if (text) toast.success(text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocurrió un error. Inténtalo de nuevo.");
    }
  };
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export function positiveNumber(fd: FormData, key: string, label: string) {
  const n = parseFloat(str(fd, key));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} debe ser un número mayor a 0`);
  return n;
}

/** Archivo opcional de un formulario (input type=file vacío → null). */
export function optionalFile(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}
