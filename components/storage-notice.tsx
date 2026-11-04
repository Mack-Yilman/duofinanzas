"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const KEY = "duo-storage-notice-v1";
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
};

/**
 * Aviso informativo (no bloqueante): solo usamos almacenamiento estrictamente
 * necesario, por lo que no se requiere consentimiento para cookies opcionales.
 */
export function StorageNotice() {
  const seen = useSyncExternalStore(() => () => {}, read, () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;

  return (
    <div role="status" className="fixed inset-x-3 bottom-40 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg md:bottom-6">
      <div className="flex items-start gap-3">
        <p className="flex-1">
          Usamos solo almacenamiento <strong>estrictamente necesario</strong> (tu sesión y tu preferencia de tema). Sin
          publicidad ni analítica. <Link href="/cookies" className="underline">Más información</Link>.
        </p>
        <button
          type="button"
          aria-label="Cerrar aviso"
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* modo privado */
            }
            setClosed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
