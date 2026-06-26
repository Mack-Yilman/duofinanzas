import { getDashboardData } from "@/app/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { deleteExpenseAction, settleExpenseAction } from "@/app/actions/expenses";
import { ExpenseContributions } from "@/components/expense-contributions";
import { formatMoney } from "@/lib/domain/money";

export default async function ExpensesPage() {
  // Reuse dashboard action for expenses list
  const data = await getDashboardData();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground mt-2">Historial de gastos del ciclo actual.</p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Gasto</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {data.expenses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aún no hay gastos registrados. ¡Agrega el primero!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.expenses.map(exp => (
              <Card key={exp.id}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <p className="font-medium">{exp.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{exp.date.toLocaleDateString()}</span>
                        <span className="capitalize px-2 py-0.5 bg-muted rounded-full">{exp.splitMode}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-lg tabular">{formatMoney(exp.amount, exp.currency)}</p>
                        {exp.currency !== "PEN" && (
                          <p className="text-xs text-muted-foreground tabular">
                            Base: {formatMoney(exp.amountBase, "PEN")}
                          </p>
                        )}
                      </div>
                      {!exp.isSettled && exp.isShared && (
                        <form action={settleExpenseAction}>
                          <input type="hidden" name="id" value={exp.id} />
                          <button type="submit" title="Marcar como pagado" className="text-muted-foreground hover:text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                      <Link href={`/expenses/${exp.id}/edit`} title="Editar" className="text-muted-foreground hover:text-brand-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                      </Link>
                      <form action={deleteExpenseAction}>
                        <input type="hidden" name="id" value={exp.id} />
                        <button type="submit" title="Eliminar" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <ExpenseContributions
                    expense={exp}
                    nameA={data.equity.nameA}
                    nameB={data.equity.nameB}
                    userAId={data.userAId}
                    currentUserId={data.currentUserId}
                    className="border-t border-border/60 pt-3"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
