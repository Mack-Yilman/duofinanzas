import { ArrowDownRight, ArrowUpRight, Minus, PiggyBank, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";
import type { computeDashboard } from "@/lib/domain/dashboard";
import { cn } from "@/lib/utils";

type Stats = ReturnType<typeof computeDashboard>["stats"];

/** ↑ más gasto (ámbar) · ↓ menos gasto (verde). */
export function Delta({ pct, className }: { pct: number | null; className?: string }) {
  if (pct === null) return <span className={cn("text-xs text-muted-foreground", className)}>nuevo</span>;
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        pct > 0 ? "text-amber-600 dark:text-amber-400" : pct < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
        className
      )}
      aria-label={`${pct > 0 ? "+" : ""}${pct} % frente al periodo anterior`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {pct > 0 ? "+" : ""}
      {pct} %
    </span>
  );
}

const pctText = (r: number | null) => (r === null ? "—" : `${r} %`);

/** Comparativa, proyección de cierre y tasa de ahorro del periodo. */
export function StatsCard({ stats }: { stats: Stats }) {
  const { comparison: c, projection: p, savings: s } = stats;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gasto del periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">{formatMoney(c.total, "PEN")}</span>
            <Delta pct={c.deltaPct} />
          </div>
          <p className="text-xs text-muted-foreground">
            Anterior ({stats.previousLabel}): {formatMoney(c.prevTotal, "PEN")}
          </p>
          <ul className="space-y-1.5 text-sm" aria-label="Categorías frente al periodo anterior">
            {c.byCategory.map((x) => (
              <li key={x.id || "none"} className="flex items-center justify-between gap-2">
                <span className="truncate">{x.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">{formatMoney(x.amount, "PEN")}</span>
                  <Delta pct={x.deltaPct} />
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" aria-hidden /> Proyección de cierre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {p ? (
            <>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(p.projected, "PEN")}</p>
              <p className="text-muted-foreground">
                Al ritmo de {formatMoney(p.dailyAvg, "PEN")}/día (día {p.daysElapsed} de {p.daysTotal}).
                {p.daysElapsed < 7 && <span className="block text-xs">Estimación preliminar: se afina con más días.</span>}
              </p>
              {p.pctOfBudget !== null && (
                <p className={cn("font-medium", p.pctOfBudget > 100 ? "text-destructive" : p.pctOfBudget >= 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {p.pctOfBudget} % de sus presupuestos ({formatMoney(p.budgetTotal, "PEN")})
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Disponible para el periodo en curso.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <PiggyBank className="h-4 w-4" aria-hidden /> Tasa de ahorro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{pctText(s.me.rate)}</p>
            <p className="text-muted-foreground">
              Tuya: ingresos {formatMoney(s.me.income, "PEN")} · gastos {formatMoney(s.me.spent, "PEN")}
            </p>
          </div>
          <div>
            <p className="font-medium tabular-nums">{pctText(s.couple.rate)} de la pareja</p>
            <p className="text-muted-foreground">Ingresos de ambos menos gastos compartidos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
