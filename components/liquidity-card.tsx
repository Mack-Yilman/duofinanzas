import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LiquidityCard({ liquidity }: { liquidity: Record<string, number> }) {
  const currencies = Object.keys(liquidity);
  const isEmpty = currencies.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Liquidez Disponible</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div>
            <div className="tabular text-3xl font-semibold text-muted-foreground">0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Sin ingresos registrados aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currencies.map(curr => {
              const amount = liquidity[curr];
              const isPositive = amount > 0;

              return (
                <div key={curr} className="flex justify-between items-center border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className={cn(
                      "tabular text-3xl font-semibold tracking-tight",
                      isPositive ? "text-brand-600 dark:text-brand-500" : "text-destructive"
                    )}>
                      <span className="text-base font-medium text-muted-foreground mr-1">{curr}</span>
                      {amount.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isPositive ? "Disponible para uso personal" : "Excediste tus ingresos"}
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
