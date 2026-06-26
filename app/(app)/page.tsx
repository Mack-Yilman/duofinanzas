import { getDashboardData } from "@/app/actions/dashboard";
import { EquityBar } from "@/components/equity-bar";
import { BalanceCard } from "@/components/balance-card";
import { LiquidityCard } from "@/components/liquidity-card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { Trash2, CheckCircle2 } from "lucide-react";
import { deleteExpenseAction, settleExpenseAction } from "@/app/actions/expenses";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();
  
  if (!session?.user) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bienvenido a DúoFinanzas. Aquí verás un resumen de tu mes.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <BalanceCard 
          balance={data.balance} 
          currentUserName={session.user.name || "Tú"} 
          partnerName={data.equity.userB === session.user.id ? "Tu pareja" : "Tu pareja"} // Simplified
        />
        
        <LiquidityCard liquidity={data.liquidity} />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proporción de Ingresos (Equity)</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityBar 
              shareA={data.equity.shareA} 
              shareB={data.equity.shareB} 
              incomeA={data.equity.incomeA} 
              incomeB={data.equity.incomeB} 
              nameA="Usuario A"
              nameB="Usuario B"
            />
          </CardContent>
        </Card>
      </div>

      <DashboardCharts expenses={data.expenses} categories={data.categories} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Gastos Recientes</h2>
        {data.expenses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay gastos registrados este mes.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.expenses.slice(0, 5).map(exp => (
              <Card key={exp.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{exp.name}</p>
                    <p className="text-xs text-muted-foreground">{exp.date.toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{exp.currency} {exp.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{exp.splitMode}</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
