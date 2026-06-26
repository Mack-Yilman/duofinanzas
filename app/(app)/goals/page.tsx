import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { getGoals } from "@/lib/repos/goals";
import { deleteGoalAction, contributeToGoalAction } from "@/app/actions/goals";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const coupleId = (session.user as any).coupleId;
  const goals = await getGoals(coupleId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas de Ahorro</h1>
          <p className="text-muted-foreground mt-2">Gestionen sus objetivos financieros juntos.</p>
        </div>
        <Link href="/goals/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Meta</span>
          </Button>
        </Link>
      </div>

      {goals.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Metas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goals.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progreso Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-600">
                {goals.reduce((acc, g) => acc + g.targetAmount, 0) > 0 
                  ? Math.round((goals.reduce((acc, g) => acc + g.currentAmount, 0) / goals.reduce((acc, g) => acc + g.targetAmount, 0)) * 100) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meta más cercana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate">
                {goals.sort((a, b) => (b.currentAmount/b.targetAmount) - (a.currentAmount/a.targetAmount))[0]?.name || "-"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aún no tienen metas de ahorro registradas. ¡Empiecen ahora!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => {
            const percentage = goal.targetAmount > 0 
              ? Math.round((goal.currentAmount / goal.targetAmount) * 100) 
              : 0;
            return (
              <Card key={goal.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{goal.icon}</span> {goal.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Link href={`/goals/${goal.id}/edit`} title="Editar" className="text-muted-foreground hover:text-brand-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                      </Link>
                      <form action={deleteGoalAction}>
                        <input type="hidden" name="id" value={goal.id} />
                        <button type="submit" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <CardDescription>
                    {goal.currency} {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground">{percentage}% completado</p>
                    </div>
                    
                    <form action={contributeToGoalAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={goal.id} />
                      <input type="hidden" name="currentAmount" value={goal.currentAmount} />
                      <input
                        type="number"
                        name="contribution"
                        placeholder="Monto a aportar"
                        required
                        min="0.01"
                        step="0.01"
                        className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <select
                        name="contributionCurrency"
                        defaultValue={goal.currency}
                        title="Moneda del aporte"
                        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      <Button type="submit" size="sm" variant="secondary">Aportar</Button>
                    </form>
                    <p className="text-[11px] text-muted-foreground">
                      Meta en {goal.currency}. Si aportas en otra moneda, se convierte automáticamente.
                    </p>
                    
                    <div className="pt-2">
                      <Link href={`/goals/${goal.id}/contributions`} className="text-xs text-brand-500 hover:underline">
                        Ver historial de aportes &rarr;
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
