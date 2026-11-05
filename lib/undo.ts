import { toast } from "sonner";
import { queryClient } from "./query-client";

/** Segundos para deshacer un borrado. */
export const UNDO_MS = 5000;

type Keyed = { id: string };

/**
 * Oculta al instante un elemento de todas las listas en caché que lo contengan
 * (datos de pareja y metas) sin tocar la base de datos.
 */
function hideFromCache(id: string) {
  queryClient.setQueriesData<unknown>({ predicate: () => true }, (old: unknown) => {
    if (Array.isArray(old)) return old.some((x: Keyed) => x?.id === id) ? old.filter((x: Keyed) => x?.id !== id) : old;
    if (old && typeof old === "object") {
      let changed = false;
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(old as Record<string, unknown>)) {
        if (Array.isArray(v) && v.some((x: Keyed) => x?.id === id)) {
          next[k] = v.filter((x: Keyed) => x?.id !== id);
          changed = true;
        } else next[k] = v;
      }
      return changed ? next : old;
    }
    return old;
  });
}

/**
 * Borrado con "Deshacer": se oculta de inmediato y se elimina de verdad tras UNDO_MS.
 * Si la persona pulsa Deshacer (o cierra la app antes), no se borra nada.
 */
export function deferDelete(opts: { id: string; label: string; commit: () => Promise<void> }) {
  hideFromCache(opts.id);
  let undone = false;
  const timer = setTimeout(async () => {
    if (undone) return;
    try {
      await opts.commit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      await queryClient.invalidateQueries();
    }
  }, UNDO_MS);
  toast(opts.label, {
    duration: UNDO_MS,
    action: {
      label: "Deshacer",
      onClick: () => {
        undone = true;
        clearTimeout(timer);
        void queryClient.invalidateQueries();
        toast.success("Restaurado");
      },
    },
  });
}
