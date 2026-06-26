import { getGoalContributions } from "@/lib/repos/goal-contributions";
import { getGoal } from "@/lib/repos/goals";
import { getUsersByCoupleId } from "@/lib/repos/users";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deleteContributionAction } from "@/app/actions/goal-contributions";
import { Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function GoalContributionsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const coupleId = (session.user as any).coupleId;
  
  const goal = await getGoal(id);
  const contributions = await getGoalContributions(id);
  const users = await getUsersByCoupleId(coupleId);
  
  // Calculate totals per user
  const totals: Record<string, number> = {};
  for (const c of contributions) {
    if (!totals[c.userId]) totals[c.userId] = 0;
    totals[c.userId] += c.amount;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/goals">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Aportes</h1>
          <p className="text-muted-foreground mt-2">{goal.icon} {goal.name}</p>
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
              users.map(user => {
                const total = totals[user.id] || 0;
                const percentage = goal.currentAmount > 0 ? Math.round((total / goal.currentAmount) * 100) : 0;
                if (total === 0) return null;
                
                return (
                  <div key={user.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <span className="font-medium">{user.name}</span>
                    <div className="text-right">
                      <span className="block font-bold">{goal.currency} {total.toFixed(2)}</span>
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
            {!(process.env.GOALS_CONTRIBUTIONS_DB_ID || process.env.GOAL_CONTRIBUTIONS_DB_ID) ? (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md">
                No se ha configurado la base de datos de aportes en Notion (GOALS_CONTRIBUTIONS_DB_ID). Los aportes detallados no se están guardando.
              </div>
            ) : contributions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay aportes detallados.</p>
            ) : (
              contributions.map(c => {
                const userName = users.find(u => u.id === c.userId)?.name || "Usuario";
                return (
                  <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{c.date.toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-brand-600">
                        {c.currency} {c.amount.toFixed(2)}
                      </span>
                      <form action={deleteContributionAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="goalId" value={goal.id} />
                        <input type="hidden" name="amount" value={c.amount} />
                        <button type="submit" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
