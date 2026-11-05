"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción; en `next dev` rompería la recarga en caliente). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const version = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
    navigator.serviceWorker
      .register(`${base}/sw.js?v=${encodeURIComponent(version)}`, { scope: `${base}/` })
      .catch(() => {
        /* sin SW la app funciona igual (solo sin modo offline) */
      });
  }, []);
  return null;
}
