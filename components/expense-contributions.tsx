import { Expense } from "@/lib/types";
import { getExpenseShares } from "@/lib/domain/split";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";

/**
 * Muestra, por gasto, cuánto aporta cada persona según el reparto.
 * - Compartido: dos chips ("Tú: S/ X" + "[Pareja]: S/ Y").
 * - Personal: un chip "100% [persona] · personal" en color de acento.
 */
export function ExpenseContributions({
  expense,
  nameA,
  nameB,
  userAId,
  currentUserId,
  className,
}: {
  expense: Expense;
  nameA: string;
  nameB: string;
  userAId: string;
  currentUserId: string;
  className?: string;
}) {
  const { quotaA, quotaB } = getExpenseShares(expense, userAId);
  const currentIsA = currentUserId === userAId;

  // Gasto personal: 100% de quien lo pagó.
  if (!expense.isShared) {
    const ownerIsCurrent = expense.paidById === currentUserId;
    const ownerName = ownerIsCurrent ? "Tú" : expense.paidById === userAId ? nameA : nameB;
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--user-a)]/15 px-2 py-0.5 text-xs font-medium text-[color:var(--user-a)] ring-1 ring-[var(--user-a)]/30">
          100% {ownerName} · personal
        </span>
      </div>
    );
  }

  const sides = [
    { label: currentIsA ? "Tú" : nameA, amount: quotaA, isCurrent: currentIsA },
    { label: currentIsA ? nameB : "Tú", amount: quotaB, isCurrent: !currentIsA },
  ];

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {sides.map((s, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
            s.isCurrent
              ? "bg-primary/10 text-primary ring-primary/25"
              : "bg-muted text-muted-foreground ring-border/70"
          )}
        >
          {s.label}: <span className="tabular">{formatMoney(s.amount, expense.currency)}</span>
        </span>
      ))}
    </div>
  );
}
