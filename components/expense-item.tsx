"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, CheckCircle2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseContributions } from "@/components/expense-contributions";
import { ReceiptInput } from "@/components/receipt-input";
import { ReceiptGallery } from "@/components/receipt-gallery";
import { deleteExpenseAction, settleExpenseAction } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/domain/money";
import type { Category, Expense } from "@/lib/types";
import type { Receipt } from "@/lib/repos/receipts";
import { cn } from "@/lib/utils";

const SPLIT_LABEL: Record<string, string> = {
  proportional: "Proporcional",
  equal: "50/50",
  custom: "Personalizado",
  owner_100: "Personal",
};

const iconBtn = "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted";

/** Tarjeta de gasto reutilizada por el dashboard y la lista de gastos. */
export function ExpenseItem({
  exp,
  nameA,
  nameB,
  userAId,
  currentUserId,
  category,
  receipts = [],
  names,
  showBase = false,
}: {
  exp: Expense;
  nameA: string;
  nameB: string;
  userAId: string;
  currentUserId: string;
  category?: Category;
  receipts?: Receipt[];
  names?: Record<string, string>;
  showBase?: boolean;
}) {
  const [settling, setSettling] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-medium">{exp.name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{exp.date.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
              {category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  <span aria-hidden>{category.icon}</span> {category.name}
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5">{SPLIT_LABEL[exp.splitMode] || exp.splitMode}</span>
              {exp.isShared && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-medium",
                    exp.isSettled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  )}
                >
                  {exp.isSettled ? "Pagado" : "Pendiente"}
                </span>
              )}
              <ReceiptGallery receipts={receipts} names={names} />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="mr-2 text-left sm:text-right">
              <p className="tabular text-lg font-semibold">{formatMoney(exp.amount, exp.currency)}</p>
              {showBase && exp.currency !== "PEN" && (
                <p className="tabular text-xs text-muted-foreground">Base: {formatMoney(exp.amountBase, "PEN")}</p>
              )}
            </div>
            {!exp.isSettled && exp.isShared && (
              <button
                type="button"
                title="Marcar como pagado"
                aria-label="Marcar como pagado"
                aria-expanded={settling}
                onClick={() => setSettling((v) => !v)}
                className={cn(iconBtn, "hover:text-success", settling && "bg-muted text-success")}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
            <Link href={`/expenses/edit?id=${exp.id}`} title="Editar" aria-label="Editar" className={cn(iconBtn, "hover:text-primary")}>
              <Pencil className="h-4 w-4" />
            </Link>
            <form action={deleteExpenseAction}>
              <input type="hidden" name="id" value={exp.id} />
              <button type="submit" title="Eliminar" aria-label="Eliminar" className={cn(iconBtn, "hover:text-destructive")}>
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {settling && (
          <form
            className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                await settleExpenseAction(fd);
                setSettling(false);
              });
            }}
          >
            <input type="hidden" name="id" value={exp.id} />
            <ReceiptInput
              label="Constancia del pago (opcional)"
              hint="Captura de la transferencia o Yape/Plin."
              disabled={pending}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setSettling(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Confirmar pago"}
              </Button>
            </div>
          </form>
        )}

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
