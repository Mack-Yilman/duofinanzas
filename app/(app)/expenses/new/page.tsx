"use client";

import { ExpenseForm } from "@/components/expense-form";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";

export default function NewExpensePage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton rows={1} />;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Gasto</h1>
        <p className="text-muted-foreground mt-2">Registra un nuevo gasto compartido o personal.</p>
      </div>
      <ExpenseForm categories={data.categories} />
    </div>
  );
}
