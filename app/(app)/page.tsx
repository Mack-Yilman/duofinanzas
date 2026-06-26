import { getDashboardData } from "@/app/actions/dashboard";
import { EquityBar } from "@/components/equity-bar";
import { BalanceCard } from "@/components/balance-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";

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

      <div className="grid gap-6 md:grid-cols-2">
        <BalanceCard 
          balance={data.balance} 
          currentUserName={session.user.name || "Tú"} 
          partnerName={data.equity.userB === session.user.id ? "Tu pareja" : "Tu pareja"} // Simplified
        />
        
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
                  <div className="text-right">
                    <p className="font-semibold">{exp.currency} {exp.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{exp.splitMode}</p>
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
