"use client";

import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IncomeForm } from "@/components/income-form";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { useIdParam } from "@/lib/hooks";

function EditIncome() {
  const id = useIdParam();
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data) return <PageSkeleton />;
  const income = data.incomes.find((i) => i.id === id);
  if (!income) return <PageError error={new Error("No se encontró el ingreso.")} />;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Ingreso</h1>
        <p className="text-muted-foreground mt-2">Corrige el monto, la fecha o desactívalo si ya no lo recibes.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{income.name}</CardTitle>
          <CardDescription>Los cambios recalculan la proporción de aportes de la pareja.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* key: remonta el formulario si cambia el ingreso cargado */}
          <IncomeForm key={income.id} initial={income} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditIncomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditIncome />
    </Suspense>
  );
}
