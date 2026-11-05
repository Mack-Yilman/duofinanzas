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
import { availableYears, computeAnnual } from "@/lib/domain/annual";
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
