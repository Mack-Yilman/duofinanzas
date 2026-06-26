import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

type Breakdown = { owedToYou: number; youOwe: number };

export function BalanceCard({
  breakdown = {},
  partnerName,
}: {
  breakdown?: Record<string, Breakdown>;
  partnerName: string;
}) {
  const currencies = Object.keys(breakdown).filter(
    (c) => breakdown[c].owedToYou > 0 || breakdown[c].youOwe > 0
  );
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
          <div className="space-y-5">
            {currencies.map((curr) => {
              const { owedToYou, youOwe } = breakdown[curr];
              const net = Math.round((owedToYou - youOwe) * 100) / 100;
              const partnerOwesNet = net > 0;
              const isZeroNet = net === 0;

              return (
                <div key={curr} className="border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  {/* Neto */}
                  <div
                    className={cn(
                      "tabular text-3xl font-semibold tracking-tight",
                      isZeroNet
                        ? "text-muted-foreground"
                        : partnerOwesNet
                          ? "text-brand-600 dark:text-brand-500"
                          : "text-destructive"
                    )}
                  >
                    <span className="text-base font-medium text-muted-foreground mr-1">{curr}</span>
                    {Math.abs(net).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {isZeroNet
                      ? "Saldo neto en cero"
                      : partnerOwesNet
                        ? `Neto: ${partnerName} te debe`
                        : `Neto: le debes a ${partnerName}`}
                  </p>

                  {/* Desglose bruto: te deben / debes (no se restan entre sí) */}
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-brand-600/8 px-3 py-2 ring-1 ring-brand-600/15">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Te deben
                      </p>
                      <p className="tabular text-lg font-semibold text-brand-600 dark:text-brand-500">
                        {formatMoney(owedToYou, curr)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-destructive/8 px-3 py-2 ring-1 ring-destructive/15">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Debes
                      </p>
                      <p className="tabular text-lg font-semibold text-destructive">
                        {formatMoney(youOwe, curr)}
                      </p>
                    </div>
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
