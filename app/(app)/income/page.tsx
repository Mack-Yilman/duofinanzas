import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Globe, TrendingUp, Coins, Trash2 } from "lucide-react";
import { getIncomes } from "@/lib/repos/incomes";
import { deleteIncomeAction } from "@/app/actions/incomes";
import { auth } from "@/auth";
import Link from "next/link";

export default async function IncomePage() {
  const session = await auth();
  if (!session?.user) return null;

  const incomes = await getIncomes();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ingresos</h1>
          <p className="text-muted-foreground mt-2">Gestionen sus fuentes de ingresos declaradas.</p>
        </div>
        <Link href="/income/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Ingreso</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {incomes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aún no hay ingresos declarados.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {incomes.map(inc => (
              <Card key={inc.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {inc.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {inc.type === "salary" && <Briefcase className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "freelance" && <Globe className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "bonus" && <TrendingUp className="w-4 h-4 text-muted-foreground" />}
                    {inc.type === "other" && <Coins className="w-4 h-4 text-muted-foreground" />}
                    <form action={deleteIncomeAction}>
                      <input type="hidden" name="id" value={inc.id} />
                      <button type="submit" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">{inc.type} • {inc.period}</p>
                      <p className="text-xs font-medium mt-1">{inc.effectiveDate.toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{inc.currency} {inc.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{inc.isActive ? 'Activo' : 'Inactivo'}</p>
                    </div>
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
