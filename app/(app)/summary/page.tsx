"use client";

import { Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { availableYears, compareYearOverYear, computeAnnual } from "@/lib/domain/annual";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

// recharts va en un chunk aparte (igual que en el dashboard).
const AnnualChart = dynamic(() => import("@/components/annual-chart").then((m) => m.AnnualChart), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl bg-muted animate-pulse" />,
});

function Summary() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);
  const sp = useSearchParams();

  const visible = useMemo(
    () => (data && me ? data.expenses.filter((e) => e.isShared || e.paidById === me.id) : []),
    [data, me]
  );
  const years = useMemo(() => availableYears(visible), [visible]);
  const year = Number(sp.get("year")) || years[0];
  const r = useMemo(() => computeAnnual(visible, data?.categories ?? [], year), [visible, data, year]);
  const yoy = useMemo(() => compareYearOverYear(visible, data?.categories ?? [], year), [visible, data, year]);

  if (error) return <PageError error={error} />;
  if (isLoading || !data || !me) return <PageSkeleton />;

  const stat = (label: string, value: string) => (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title={`Resumen ${year}`}
        description="Gastos por mes y categoría (en soles). Incluye tus gastos personales; los de tu pareja no."
        actions={
          <nav className="flex flex-wrap gap-2" aria-label="Año">
            {years.map((y) => (
              <Link
                key={y}
                href={`/summary?year=${y}`}
                aria-current={y === year ? "page" : undefined}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  y === year ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                )}
              >
                {y}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stat("Total del año", formatMoney(r.total, "PEN"))}
        {stat("Promedio por mes con gastos", formatMoney(r.monthlyAverage, "PEN"))}
        {stat("Movimientos", String(visible.filter((e) => e.date.getFullYear() === year).length))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Gastos por mes</CardTitle></CardHeader>
        <CardContent><AnnualChart months={r.months} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparado con {yoy.previousYear}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {yoy.partial ? `Del 1 de enero a hoy frente al mismo tramo de ${yoy.previousYear}.` : `Año completo frente a ${yoy.previousYear}.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex flex-wrap items-baseline gap-x-2" data-testid="yoy-total">
            <span className="text-xl font-semibold tabular-nums">{formatMoney(yoy.total, "PEN")}</span>
            <span className="text-muted-foreground">vs {formatMoney(yoy.prevTotal, "PEN")}</span>
            <DeltaBadge pct={yoy.deltaPct} />
          </p>
          {yoy.byCategory.map((c) => (
            <div key={c.id || "none"} className="flex items-center justify-between gap-2">
              <span className="truncate">{c.name}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {formatMoney(c.amount, "PEN")}
                <span className="text-xs text-muted-foreground">vs {formatMoney(c.previous, "PEN")}</span>
                <DeltaBadge pct={c.deltaPct} />
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top categorías</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.topCategories.length === 0 && <p className="text-muted-foreground">Sin gastos este año.</p>}
            {r.topCategories.map((c) => (
              <div key={c.id || "none"} className="flex justify-between gap-2">
                <span className="truncate">{c.name}</span>
                <span className="tabular-nums">{formatMoney(c.amount, "PEN")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pagado por cada uno</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.users.map((u) => (
              <div key={u.id} className="flex justify-between gap-2">
                <span className="truncate">{u.name || "—"}</span>
                <span className="tabular-nums">{formatMoney(r.byPayer[u.id] ?? 0, "PEN")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Summary />
    </Suspense>
  );
}

/** Variación: más gasto en rojo, menos en verde; sin base de comparación, “nuevo”. */
function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">sin datos previos</span>;
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", pct > 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
      {pct > 0 ? "+" : ""}{pct} %
    </span>
  );
}
