"use client";

import { Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { createRecurringAction, deleteRecurringAction, toggleRecurringAction } from "@/lib/actions/recurring";
import { formatMoney } from "@/lib/domain/money";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function RecurringPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);
  const [isPersonal, setIsPersonal] = useState(false);

  if (error) return <PageError error={error} />;
  if (isLoading || !data || !me) return <PageSkeleton />;

  const catById = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const nameOf = (id: string) => data.users.find((u) => u.id === id)?.name || "—";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Gastos recurrentes"
        description="Alquiler, servicios o suscripciones: se registran solos cada mes al abrir la app."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nuevo gasto recurrente</CardTitle>
          <CardDescription>Lo pagas tú; el reparto se calcula igual que un gasto normal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createRecurringAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="r-name">Descripción</Label>
              <Input id="r-name" name="name" placeholder="Ej. Alquiler" required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-amount">Monto</Label>
              <Input id="r-amount" name="amount" type="number" step="0.01" min="0.01" required inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-currency">Moneda</Label>
              <select id="r-currency" name="currency" defaultValue="PEN" className={selectClass}>
                <option value="PEN">Soles (PEN)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-day">Día del mes (1-28)</Label>
              <Input id="r-day" name="dayOfMonth" type="number" min="1" max="28" defaultValue={Math.min(new Date().getDate(), 28)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-cat">Categoría</Label>
              <select id="r-cat" name="categoryId" defaultValue="" className={selectClass}>
                <option value="">Sin categoría</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="r-personal"
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="r-personal">Gasto personal (no se divide)</Label>
              <input type="hidden" name="isShared" value={isPersonal ? "false" : "true"} />
            </div>
            {!isPersonal && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="r-split">Forma de dividir</Label>
                <select id="r-split" name="splitMode" defaultValue="proportional" className={selectClass}>
                  <option value="proportional">Proporcional (según ingresos)</option>
                  <option value="equal">Partes iguales (50/50)</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> Crear</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.recurring.length === 0 ? (
        <EmptyState icon={<Repeat className="h-5 w-5" />} title="Aún no hay gastos recurrentes">
          También puedes marcar “Repetir cada mes” al registrar un gasto.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {data.recurring.map((r) => (
            <Card key={r.id} className={r.isActive ? "" : "opacity-60"}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {catById[r.categoryId]?.icon ?? "🔁"} {r.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(r.amount, r.currency)} · día {r.dayOfMonth} · paga {nameOf(r.paidById)} ·{" "}
                    {r.isShared ? "compartido" : "personal"} ·{" "}
                    {r.isActive ? `próximo ${r.nextDate.toLocaleDateString("es-PE")}` : "en pausa"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <form action={toggleRecurringAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dayOfMonth" value={r.dayOfMonth} />
                    <input type="hidden" name="active" value={r.isActive ? "false" : "true"} />
                    <Button type="submit" variant="ghost" size="icon" aria-label={r.isActive ? `Pausar ${r.name}` : `Reactivar ${r.name}`}>
                      {r.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </form>
                  <form action={deleteRecurringAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="icon" aria-label={`Eliminar ${r.name}`} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
