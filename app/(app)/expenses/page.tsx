"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PeriodSelector } from "@/components/period-selector";
import { ExpenseItem } from "@/components/expense-item";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useDashboard, useViewParams } from "@/lib/hooks";

function Expenses() {
  const { view, offset } = useViewParams();
  const { data, isLoading, error } = useDashboard(view, offset);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-2">
            {view === "global" ? "Todo el historial de gastos." : "Gastos del periodo seleccionado."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector basePath="/expenses" view={view} offset={offset} label={data.periodLabel} />
          <Link href="/expenses/new" className={buttonVariants({ className: "gap-2" })}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </Link>
        </div>
      </div>

      {data.expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aún no hay gastos registrados. ¡Agrega el primero!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.expenses.map((exp) => (
            <ExpenseItem
              key={exp.id}
              exp={exp}
              nameA={data.equity.nameA}
              nameB={data.equity.nameB}
              userAId={data.userAId}
              currentUserId={data.currentUserId}
              showBase
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Expenses />
    </Suspense>
  );
}
