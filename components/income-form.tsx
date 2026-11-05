"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addIncomeAction, updateIncomeAction } from "@/lib/actions/incomes";
import { toDateString } from "@/lib/domain/dates";
import type { Income } from "@/lib/types";

/** Formulario de ingreso: crea (sin `initial`) o edita uno existente. */
export function IncomeForm({ initial }: { initial?: Income }) {
  return (
    <form action={initial ? updateIncomeAction : addIncomeAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-2">
        <Label htmlFor="name">Descripción del Ingreso</Label>
        <Input id="name" name="name" placeholder="Ej. Salario, Bono, etc." defaultValue={initial?.name} required maxLength={120} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" defaultValue={initial?.amount} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <Select name="currency" defaultValue={initial?.currency ?? "PEN"}>
            <SelectTrigger><SelectValue placeholder="Moneda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PEN">Soles (PEN)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
              <SelectItem value="EUR">Euros (EUR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select name="type" defaultValue={initial?.type ?? "salary"}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="salary">Salario</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="bonus">Bono</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="period">Periodicidad</Label>
          <Select name="period" defaultValue={initial?.period ?? "monthly"}>
            <SelectTrigger><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="one_time">Ocasional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="effectiveDate">Fecha Efectiva</Label>
        <Input
          id="effectiveDate"
          name="effectiveDate"
          type="date"
          defaultValue={initial ? toDateString(initial.effectiveDate) : undefined}
          required
        />
      </div>

      {initial && (
        <div className="flex items-center gap-2">
          <input id="isActive" name="isActive" type="checkbox" defaultChecked={initial.isActive} className="h-4 w-4 rounded border-input" />
          <Label htmlFor="isActive">Activo (cuenta para la proporción de aportes y la liquidez)</Label>
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3">
        <Link href="/income" className={buttonVariants({ variant: "outline" })}>Cancelar</Link>
        <Button type="submit">{initial ? "Guardar cambios" : "Guardar Ingreso"}</Button>
      </div>
    </form>
  );
}
