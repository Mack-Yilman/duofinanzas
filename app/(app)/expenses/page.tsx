"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileUp, Plus, Receipt, Repeat, SearchX } from "lucide-react";
import { ExpenseFilters } from "@/components/expense-filters";
import { SettleAll } from "@/components/settle-all";
import { filterExpenses, hasFilters, parseFilters } from "@/lib/domain/filters";
import { ExportButtons } from "@/components/export-buttons";
import { EmptyState } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { PeriodSelector } from "@/components/period-selector";
import { ExpenseItem } from "@/components/expense-item";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useDashboard, useViewParams } from "@/lib/hooks";

function Expenses() {
  const { view, offset } = useViewParams();
  const { data, isLoading, error } = useDashboard(view, offset);
  const sp = useSearchParams();
  const filters = parseFilters(sp);
  const filtering = hasFilters(filters);
  const shown = useMemo(
    () => (data ? filterExpenses(data.expenses, filters, (id) => data.categoryById[id]?.name ?? "") : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, sp]
  );
  // Conserva los filtros al cambiar de periodo.
  const keep = ["q", "cat", "who", "status"].map((k) => (sp.get(k) ? `&${k}=${encodeURIComponent(sp.get(k)!)}` : "")).join("");

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Gastos</h1>
          <p className="mt-1.5 text-muted-foreground">
            {view === "global" ? "Todo el historial de gastos." : `Periodo ${data.periodLabel}`}
          </p>
          <div className="mt-3">
            <ExportButtons
              expenses={shown}
              categories={data.categories}
              names={data.names}
              label={view === "global" ? "historico" : data.periodLabel}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <PeriodSelector basePath="/expenses" view={view} offset={offset} label={data.periodLabel} keep={keep} />
          <Link href="/expenses/import" className={buttonVariants({ variant: "outline", className: "gap-2" })} aria-label="Importar CSV">
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </Link>
          <Link href="/recurring" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
            <Repeat className="w-4 h-4" />
            <span className="hidden sm:inline">Recurrentes</span>
          </Link>
          <Link href="/expenses/new" className={buttonVariants({ className: "gap-2" })}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </Link>
        </div>
      </div>

      <SettleAll breakdown={data.breakdown} pendingCount={data.pendingCount} partnerName={data.partnerName} />

      <ExpenseFilters categories={data.categories} users={data.users} />

      {filtering && data.expenses.length > 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {shown.length} de {data.expenses.length} gastos
        </p>
      )}

      {filtering && shown.length === 0 && data.expenses.length > 0 ? (
        <EmptyState icon={<SearchX className="h-5 w-5" />} title="Ningún gasto coincide con los filtros" />
      ) : data.expenses.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" />} title="Aún no hay gastos en esta vista">
          Usa “Nuevo gasto” para registrar el primero y, si quieres, adjunta su comprobante.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((exp) => (
            <ExpenseItem
              key={exp.id}
              exp={exp}
              nameA={data.equity.nameA}
              nameB={data.equity.nameB}
              userAId={data.userAId}
              currentUserId={data.currentUserId}
              category={data.categoryById[exp.categoryId]}
              receipts={data.receiptsByExpense[exp.id]}
              names={data.names}
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
