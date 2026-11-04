"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Pencil, Target } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import Link from "next/link";
import { deleteGoalAction, contributeToGoalAction } from "@/lib/actions/goals";
import { useMe } from "@/components/auth-provider";
import { useGoals } from "@/lib/goals-data";
import { ReceiptInput } from "@/components/receipt-input";
import { PageError, PageSkeleton } from "@/components/page-state";
import { formatMoney } from "@/lib/domain/money";

const pct = (current: number, target: number) => (target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0);

export default function GoalsPage() {
  const { data: me } = useMe();
  const { data: goals, isLoading, error } = useGoals(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !goals) return <PageSkeleton />;

  // Copia antes de ordenar: .sort() muta el array (antes reordenaba la lista visible).
  const closest = [...goals].sort((a, b) => pct(b.currentAmount, b.targetAmount) - pct(a.currentAmount, a.targetAmount))[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Metas de Ahorro</h1>
          <p className="mt-1.5 text-muted-foreground">Gestionen sus objetivos financieros juntos.</p>
        </div>
        <Link href="/goals/new" className={buttonVariants({ className: "gap-2" })}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Meta</span>
        </Link>
      </div>

      {goals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goals.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progreso Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-600">
                {goals.reduce((acc, g) => acc + g.targetAmount, 0) > 0 
                  ? Math.round((goals.reduce((acc, g) => acc + g.currentAmount, 0) / goals.reduce((acc, g) => acc + g.targetAmount, 0)) * 100) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meta más cercana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate">
                {closest?.name || "-"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={<Target className="h-5 w-5" />} title="Aún no tienen metas de ahorro">
          Creen una meta y registren aportes con su constancia para llevar el control juntos.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => {
            const percentage = pct(goal.currentAmount, goal.targetAmount);
            return (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{goal.icon}</span> {goal.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Link href={`/goals/edit?id=${goal.id}`} title="Editar" aria-label="Editar" className="text-muted-foreground hover:text-brand-500">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <form action={deleteGoalAction}>
                        <input type="hidden" name="id" value={goal.id} />
                        <button type="submit" title="Eliminar" aria-label="Eliminar" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <CardDescription>
                    {formatMoney(goal.currentAmount, goal.currency)} / {formatMoney(goal.targetAmount, goal.currency)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground">{percentage}% completado</p>
                    </div>
                    
                    <form action={contributeToGoalAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={goal.id} />
                      <input
                        type="number"
                        name="contribution"
                        placeholder="Monto a aportar"
                        aria-label="Monto a aportar"
                        required
                        min="0.01"
                        step="0.01"
                        className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <select
                        name="contributionCurrency"
                        defaultValue={goal.currency}
                        title="Moneda del aporte"
                        aria-label="Moneda del aporte"
                        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <Button type="submit" size="sm" variant="secondary">Aportar</Button>
                      <ReceiptInput label="Constancia del depósito (opcional)" hint="Captura del depósito o transferencia." className="w-full pt-1" />
                    </form>
                    <p className="text-[11px] text-muted-foreground">
                      Meta en {goal.currency}. Si aportas en otra moneda, se convierte automáticamente.
                    </p>
                    
                    <div className="pt-2">
                      <Link href={`/goals/contributions?id=${goal.id}`} className="text-xs text-brand-500 hover:underline">
                        Ver historial de aportes &rarr;
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
