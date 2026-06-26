import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

type Contribution = { current: number; partner: number };

export function BalanceCard({
  balance,
  contributions = {},
  partnerName,
}: {
  balance: Record<string, number>;
  contributions?: Record<string, Contribution>;
  partnerName: string;
}) {
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
              // Positivo => el usuario actual le debe a su pareja. Negativo => la pareja le debe.
              const currentOwes = amount > 0;
              const isZero = amount === 0;
              const contrib = contributions[curr];

              return (
                <div key={curr} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div
                    className={cn(
                      "tabular text-3xl font-semibold tracking-tight",
                      isZero
                        ? "text-muted-foreground"
                        : currentOwes
                          ? "text-destructive"
                          : "text-brand-600 dark:text-brand-500"
                    )}
                  >
                    <span className="text-base font-medium text-muted-foreground mr-1">{curr}</span>
                    {Math.abs(amount).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {isZero
                      ? "Todo saldado en esta moneda"
                      : currentOwes
                        ? `Le debes a ${partnerName}`
                        : `${partnerName} te debe`}
                  </p>

                  {contrib && (contrib.current > 0 || contrib.partner > 0) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Tú aportaste{" "}
                        <span className="tabular font-medium text-foreground">
                          {formatMoney(contrib.current, curr)}
                        </span>
                      </span>
                      <span>
                        {partnerName} aportó{" "}
                        <span className="tabular font-medium text-foreground">
                          {formatMoney(contrib.partner, curr)}
                        </span>
                      </span>
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
