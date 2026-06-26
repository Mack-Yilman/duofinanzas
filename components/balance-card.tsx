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
            <div className="tabular text-3xl font-semibold text-muted-foreground">0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Todo está saldado.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currencies.map(curr => {
              const amount = balance[curr];
              const isPositive = amount > 0;
              const isZero = amount === 0;

              return (
                <div key={curr} className="flex justify-between items-center border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className={cn(
                      "tabular text-3xl font-semibold tracking-tight",
                      isZero ? "text-muted-foreground" : (isPositive ? "text-destructive" : "text-brand-600 dark:text-brand-500")
                    )}>
                      <span className="text-base font-medium text-muted-foreground mr-1">{curr}</span>
                      {Math.abs(amount).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isZero ? "Todo saldado en esta moneda" : (isPositive ? `Le debes a ${partnerName}` : `${partnerName} te debe`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
