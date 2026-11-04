"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageError, PageSkeleton } from "@/components/page-state";
import { useMe } from "@/components/auth-provider";
import { deleteContributionAction } from "@/lib/actions/goals";
import { useGoal, useGoalContributions } from "@/lib/goals-data";
import { useCoupleData } from "@/lib/couple-data";
import { useIdParam } from "@/lib/hooks";
import { formatMoney } from "@/lib/domain/money";
import { ReceiptGallery } from "@/components/receipt-gallery";

function Contributions() {
  const id = useIdParam();
  const { data: me } = useMe();
  const goalQ = useGoal(id);
  const contribQ = useGoalContributions(id);
  const coupleQ = useCoupleData(me?.coupleId);

  const error = goalQ.error || contribQ.error || coupleQ.error;
  if (error) return <PageError error={error} />;
  if (!goalQ.data || !contribQ.data || !coupleQ.data) return <PageSkeleton rows={2} />;

  const goal = goalQ.data;
  const contributions = contribQ.data;
  const users = coupleQ.data.users;

  const totals: Record<string, number> = {};
  for (const c of contributions) totals[c.userId] = (totals[c.userId] || 0) + c.amount;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/goals" aria-label="Volver" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Aportes</h1>
          <p className="text-muted-foreground mt-2">
            {goal.icon} {goal.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen de Aportes</CardTitle>
            <CardDescription>Total acumulado por persona (cuánto puso cada uno en esta meta)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.keys(totals).length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay aportes registrados.</p>
            ) : (
              users.map((user) => {
                const total = totals[user.id] || 0;
                if (total === 0) return null;
                const percentage = goal.currentAmount > 0 ? Math.round((total / goal.currentAmount) * 100) : 0;
                return (
                  <div key={user.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{user.name}</span>
                    <div className="text-right">
                      <span className="block font-bold tabular">{formatMoney(total, goal.currency)}</span>
                      <span className="text-xs text-muted-foreground">{percentage}% del total ahorrado</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial Detallado</CardTitle>
            <CardDescription>Cada aporte individual por fecha (puedes eliminarlos uno a uno)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay aportes detallados.</p>
            ) : (
              contributions.map((c) => (
                <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{users.find((u) => u.id === c.userId)?.name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">{c.date.toLocaleDateString("es-PE")}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <ReceiptGallery
                      receipts={coupleQ.data.receipts.filter((r) => r.contributionId === c.id)}
                      names={Object.fromEntries(users.map((u) => [u.id, u.name]))}
                    />
                    <span className="font-bold text-brand-600 tabular">{formatMoney(c.amount, c.currency)}</span>
                    <form action={deleteContributionAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" title="Eliminar" aria-label="Eliminar" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GoalContributionsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <Contributions />
    </Suspense>
  );
}
