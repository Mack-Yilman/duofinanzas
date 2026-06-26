import { getDashboardData } from "@/app/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

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
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <p className="font-medium">{exp.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{exp.date.toLocaleDateString()}</span>
                      <span className="capitalize px-2 py-0.5 bg-muted rounded-full">{exp.splitMode}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-lg">{exp.currency} {exp.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Base: PEN {exp.amountBase.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
