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
            <div className="text-3xl font-bold text-muted-foreground">0.00</div>
            <p className="text-xs text-muted-foreground mt-2">Sin ingresos registrados aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currencies.map(curr => {
              const amount = liquidity[curr];
              const isPositive = amount > 0;
              const isZero = amount === 0;

              return (
                <div key={curr} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className={cn(
                      "text-2xl font-bold",
                      isPositive ? "text-brand-600" : "text-destructive"
                    )}>
                      {curr} {amount.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
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
