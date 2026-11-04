"use client";

import Link from "next/link";
import { Trash2, CheckCircle2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseContributions } from "@/components/expense-contributions";
import { deleteExpenseAction, settleExpenseAction } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/domain/money";
import type { Expense } from "@/lib/types";

const SPLIT_LABEL: Record<string, string> = {
  proportional: "Proporcional",
  equal: "50/50",
  custom: "Personalizado",
  owner_100: "Personal",
};

/** Tarjeta de gasto reutilizada por el dashboard y la lista de gastos. */
export function ExpenseItem({
  exp,
  nameA,
  nameB,
  userAId,
  currentUserId,
  showBase = false,
}: {
  exp: Expense;
  nameA: string;
  nameB: string;
  userAId: string;
  currentUserId: string;
  showBase?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <p className="font-medium">{exp.name}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{exp.date.toLocaleDateString("es-PE")}</span>
              <span className="px-2 py-0.5 bg-muted rounded-full">{SPLIT_LABEL[exp.splitMode] || exp.splitMode}</span>
              {exp.isSettled && <span className="text-emerald-600">Pagado</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left sm:text-right">
              <p className="font-semibold text-lg tabular">{formatMoney(exp.amount, exp.currency)}</p>
              {showBase && exp.currency !== "PEN" && (
                <p className="text-xs text-muted-foreground tabular">Base: {formatMoney(exp.amountBase, "PEN")}</p>
              )}
            </div>
            {!exp.isSettled && exp.isShared && (
              <form action={settleExpenseAction}>
                <input type="hidden" name="id" value={exp.id} />
                <button type="submit" title="Marcar como pagado" aria-label="Marcar como pagado" className="text-muted-foreground hover:text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}
            <Link href={`/expenses/edit?id=${exp.id}`} title="Editar" aria-label="Editar" className="text-muted-foreground hover:text-brand-500">
              <Pencil className="w-4 h-4" />
            </Link>
            <form action={deleteExpenseAction}>
              <input type="hidden" name="id" value={exp.id} />
              <button type="submit" title="Eliminar" aria-label="Eliminar" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
        <ExpenseContributions
          expense={exp}
          nameA={nameA}
          nameB={nameB}
          userAId={userAId}
          currentUserId={currentUserId}
          className="border-t border-border/60 pt-3"
        />
      </CardContent>
    </Card>
  );
}
