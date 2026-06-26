import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getIncomes } from "@/lib/repos/incomes";
import { auth } from "@/auth";

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
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Ingreso</span>
        </Button>
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
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{inc.name}</p>
                    <p className="text-xs text-muted-foreground">{inc.type} • {inc.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{inc.currency} {inc.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{inc.isActive ? 'Activo' : 'Inactivo'}</p>
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
