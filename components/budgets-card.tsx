import Link from "next/link";
import { AlertTriangle, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/domain/money";
import type { BudgetStatus } from "@/lib/domain/budgets";
import { cn } from "@/lib/utils";

const BAR: Record<BudgetStatus["level"], string> = {
  ok: "bg-primary",
  warn: "bg-amber-500",
  over: "bg-destructive",
};

/** Presupuestos del periodo actual con barras y alertas (80 % y 100 %). */
export function BudgetsCard({ budgets }: { budgets: BudgetStatus[] }) {
  if (!budgets.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <PiggyBank className="h-5 w-5 text-primary" aria-hidden />
            Define un presupuesto por categoría y te avisamos al llegar al 80 %.
          </div>
          <Link href="/categories" className="shrink-0 font-medium text-primary hover:underline">Configurar</Link>
        </CardContent>
      </Card>
    );
  }
  const alerts = budgets.filter((b) => b.level !== "ok").length;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Presupuestos del periodo</CardTitle>
        {alerts > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {alerts} {alerts === 1 ? "alerta" : "alertas"}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map((b) => (
          <div key={`${b.categoryId}-${b.personal ? "p" : "s"}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {b.icon} {b.name}
                {b.personal && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">personal</span>}
              </span>
              <span className={cn("shrink-0 tabular-nums", b.level === "over" ? "text-destructive font-medium" : "text-muted-foreground")}>
                {formatMoney(b.spent, "PEN")} / {formatMoney(b.limit, "PEN")} · {b.pct} %
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`Presupuesto${b.personal ? " personal" : ""} de ${b.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(b.pct, 100)}
            >
              <div className={cn("h-full rounded-full transition-all", BAR[b.level])} style={{ width: `${Math.min(b.pct, 100)}%` }} />
            </div>
          </div>
        ))}
        <Link href="/categories" className="inline-block text-xs text-muted-foreground hover:text-foreground hover:underline">
          Editar presupuestos
        </Link>
      </CardContent>
    </Card>
  );
}
