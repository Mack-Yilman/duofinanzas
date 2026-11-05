"use client";

import { useEffect, useState } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { deleteReceipt, signedUrls, SIGNED_URL_STALE_MS, type Receipt } from "@/lib/repos/receipts";
import { queryClient } from "@/lib/query-client";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  expense: "Comprobante del gasto",
  settlement: "Constancia de pago",
  goal_contribution: "Constancia de aporte",
};

/**
 * Botón "N constancias" que abre un visor. Las URLs se firman al abrir (15 min) y se
 * reutilizan desde la caché mientras siguen vigentes: misma URL ⇒ el navegador no vuelve a
 * descargar la imagen (ahorra transferencia del plan Free). El bucket es privado.
 */
export function ReceiptGallery({
  receipts,
  names,
  className,
}: {
  receipts: Receipt[];
  names?: Record<string, string>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const paths = receipts.map((r) => r.path).sort();
  const { data: urls = {}, isFetching: loading, error } = useQuery({
    queryKey: ["receipt-urls", paths],
    queryFn: () => signedUrls(paths),
    enabled: open && paths.length > 0,
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_STALE_MS,
  });

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : "No se pudieron cargar las constancias");
  }, [error]);

  if (!receipts.length) return null;

  function show() {
    setOpen(true);
  }

  async function remove(r: Receipt) {
    if (!confirm("¿Eliminar esta constancia?")) return;
    try {
      await deleteReceipt(r);
      toast.success("Constancia eliminada");
      await queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground", className)}
      >
        <Paperclip className="h-3 w-3" aria-hidden />
        {receipts.length} {receipts.length === 1 ? "constancia" : "constancias"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Constancias"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-popover p-4 text-popover-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Constancias</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {receipts.map((r) => (
                <figure key={r.id} className="overflow-hidden rounded-xl border border-border">
                  {urls[r.path] ? (
                    <a href={urls[r.path]} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urls[r.path]} alt={KIND_LABEL[r.kind]} className="h-56 w-full bg-muted object-contain" />
                    </a>
                  ) : (
                    <div className={cn("h-56 w-full bg-muted", loading && "animate-pulse")} />
                  )}
                  <figcaption className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
                    <span>
                      {KIND_LABEL[r.kind]}
                      {r.uploadedBy && names?.[r.uploadedBy] ? ` · ${names[r.uploadedBy]}` : ""} · {r.createdAt.toLocaleDateString("es-PE")}
                    </span>
                    <button type="button" aria-label="Eliminar constancia" onClick={() => remove(r)} className="rounded p-1 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
