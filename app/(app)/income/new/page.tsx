"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IncomeForm } from "@/components/income-form";

export default function NewIncomePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Ingreso</h1>
        <p className="text-muted-foreground mt-2">Registra un nuevo ingreso.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Ingreso</CardTitle>
          <CardDescription>Completa los datos de tu nueva fuente de ingreso.</CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeForm />
        </CardContent>
      </Card>
    </div>
  );
}
