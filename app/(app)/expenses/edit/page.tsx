"use client";

import { Suspense } from "react";
import { ExpenseForm } from "@/components/expense-form";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { useIdParam } from "@/lib/hooks";

function EditExpense() {
  const id = useIdParam();
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton rows={1} />;

  const expense = data.expenses.find((e) => e.id === id);
  if (!expense) return <PageError error={new Error("Gasto no encontrado.")} />;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Gasto</h1>
        <p className="text-muted-foreground mt-2">Modifica los detalles del gasto.</p>
      </div>
      <ExpenseForm categories={data.categories} initialData={expense} />
    </div>
  );
}

export default function EditExpensePage() {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <EditExpense />
    </Suspense>
  );
}
