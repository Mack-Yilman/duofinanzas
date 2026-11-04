"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { EquityBar } from "@/components/equity-bar";
import { BalanceCard } from "@/components/balance-card";
import { LiquidityCard } from "@/components/liquidity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/period-selector";
import { ExpenseItem } from "@/components/expense-item";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useDashboard, useViewParams } from "@/lib/hooks";

// recharts es la dependencia más pesada: se descarga aparte y solo en el dashboard.
const DashboardCharts = dynamic(() => import("@/components/dashboard-charts").then((m) => m.DashboardCharts), {
  ssr: false,
  loading: () => <div className="h-72 rounded-2xl bg-muted animate-pulse" />,
});

function Dashboard() {
  const { view, offset } = useViewParams();
  const { data, isLoading, error } = useDashboard(view, offset);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {view === "global" ? "Resumen global de todas tus finanzas." : "Resumen del periodo actual."}
          </p>
        </div>
        <PeriodSelector basePath="/" view={view} offset={offset} label={data.periodLabel} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <BalanceCard breakdown={data.breakdown} partnerName={data.partnerName} />
        <LiquidityCard liquidity={data.liquidity} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proporción de Ingresos (Equity)</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityBar
              shareA={data.equity.shareA}
              shareB={data.equity.shareB}
              incomeA={data.equity.incomeA}
              incomeB={data.equity.incomeB}
              nameA={data.equity.nameA}
              nameB={data.equity.nameB}
            />
          </CardContent>
        </Card>
      </div>

      <DashboardCharts expenses={data.expenses} categories={data.categories} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {view === "global" ? "Gastos (todo el histórico)" : "Gastos del periodo"}
        </h2>
        {data.expenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {view === "global" ? "No hay gastos registrados." : "No hay gastos en este periodo."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.expenses.slice(0, 5).map((exp) => (
              <ExpenseItem
                key={exp.id}
                exp={exp}
                nameA={data.equity.nameA}
                nameB={data.equity.nameB}
                userAId={data.userAId}
                currentUserId={data.currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
