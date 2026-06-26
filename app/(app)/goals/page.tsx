import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { getGoals } from "@/lib/repos/goals";

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
                  </div>
                  <CardDescription>
                    {goal.currency} {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">{percentage}% completado</p>
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
