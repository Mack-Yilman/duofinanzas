"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpenseAction, createExpenseAction } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category } from "@/lib/types";
import Link from "next/link";

export function ExpenseForm({ categories, initialData }: { categories: Category[], initialData?: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || "");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("categoryId", categoryId);
    
    if (initialData) {
      formData.set("id", initialData.id);
    }
    
    startTransition(() => {
      if (initialData) {
        updateExpenseAction(formData);
      } else {
        createExpenseAction(formData);
      }
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Descripción del Gasto</Label>
            <Input id="name" name="name" placeholder="Ej. Compra supermercado" defaultValue={initialData?.name} required disabled={isPending} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" defaultValue={initialData?.amount} required disabled={isPending} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select name="currency" defaultValue={initialData?.currency || "PEN"} disabled={isPending}>
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
            <div className="flex justify-between items-center">
              <Label htmlFor="categoryId">Categoría</Label>
              <Link href="/categories" className="text-xs text-brand-500 hover:underline">
                + Nueva Categoría
              </Link>
            </div>
            <select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPending}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Selecciona una categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splitMode">Forma de Dividir</Label>
            <Select name="splitMode" defaultValue={initialData?.splitMode || "proportional"} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proportional">Proporcional (Según Ingresos)</SelectItem>
                <SelectItem value="equal">Partes Iguales (50/50)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-3 border-t pt-6 bg-muted/20">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Gasto"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
