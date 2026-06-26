import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

export function BalanceCard({ balance, currentUserName, partnerName }: { balance: Record<string, number>, currentUserName: string, partnerName: string }) {
  // We can display multiple currencies, or a summary.
  const currencies = Object.keys(balance);
  const isEmpty = currencies.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Estado de Cuentas</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div>
            <div className="text-3xl font-bold text-muted-foreground">0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Todo está saldado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currencies.map(curr => {
              const amount = balance[curr];
              const isPositive = amount > 0;
              const isZero = amount === 0;

              return (
                <div key={curr} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className={cn(
                      "text-2xl font-bold",
                      isZero ? "text-muted-foreground" : (isPositive ? "text-destructive" : "text-emerald-500")
                    )}>
                      {curr} {Math.abs(amount).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isZero ? "Todo saldado en esta moneda" : (isPositive ? `Le debes a ${partnerName}` : `${partnerName} te debe`)}
                    </p>
                  </div>
                  {!isZero && (
                    <div className="text-xs text-right text-muted-foreground max-w-[120px]">
                      {isPositive ? "Tienes un saldo negativo." : "Tienes un saldo a tu favor."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
