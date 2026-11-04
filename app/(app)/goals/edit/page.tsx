"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageError, PageSkeleton } from "@/components/page-state";
import { updateGoalAction } from "@/lib/actions/goals";
import { useGoal } from "@/lib/goals-data";
import { useIdParam } from "@/lib/hooks";

function EditGoal() {
  const id = useIdParam();
  const { data: goal, isLoading, error } = useGoal(id);

  if (error || (!isLoading && !goal)) return <PageError error={error ?? new Error("Meta no encontrada.")} />;
  if (isLoading || !goal) return <PageSkeleton rows={1} />;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Meta</h1>
        <p className="text-muted-foreground mt-2">Modifica los objetivos financieros.</p>
      </div>

      <Card>
        <form action={updateGoalAction}>
          <input type="hidden" name="id" value={goal.id} />
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Meta</Label>
              <Input id="name" name="name" defaultValue={goal.name} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Monto Objetivo</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" min="0.01" defaultValue={goal.targetAmount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select name="currency" defaultValue={goal.currency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="EUR">Euros (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icono (Emoji)</Label>
              {/* maxLength 2 cortaba emojis compuestos (👨‍👩‍👧, banderas) */}
              <Input id="icon" name="icon" defaultValue={goal.icon} required maxLength={8} />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Link href="/goals" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

export default function EditGoalPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={1} />}>
      <EditGoal />
    </Suspense>
  );
}
