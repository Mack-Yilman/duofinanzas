"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "./couple-data";
import { computeDashboard, type DashboardView } from "./domain/dashboard";

/** Lee ?view=&offset= (requiere un <Suspense> por encima en export estático). */
export function useViewParams() {
  const sp = useSearchParams();
  const view: DashboardView = sp.get("view") === "global" ? "global" : "current";
  const offset = parseInt(sp.get("offset") || "0", 10) || 0;
  return { view, offset };
}

/** Datos del dashboard: una sola carga; cambiar periodo/vista se recalcula en memoria. */
export function useDashboard(view: DashboardView, offset: number) {
  const { data: me } = useMe();
  const query = useCoupleData(me?.coupleId);
  const data = useMemo(
    () => (query.data && me ? computeDashboard(query.data, me.id, { view, offset }) : undefined),
    [query.data, me, view, offset]
  );
  return { ...query, data, me };
}

/** Lee ?id= para las rutas de edición (no hay rutas dinámicas en export estático). */
export function useIdParam() {
  return useSearchParams().get("id") || "";
}
