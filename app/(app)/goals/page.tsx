import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target } from "lucide-react";
import Link from "next/link";

export default function GoalsPage() {
  // Placeholder data for MVP
  const goals = [
    {
      id: "1",
      name: "Viaje a Cancún",
      current: 1200,
      target: 4000,
      currency: "USD",
      icon: "✈️"
    },
    {
      id: "2",
      name: "Fondo de Emergencia",
      current: 5000,
      target: 10000,
      currency: "PEN",
      icon: "🏦"
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas de Ahorro</h1>
          <p className="text-muted-foreground mt-2">Gestionen sus objetivos financieros juntos.</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Meta</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map(goal => {
          const percentage = Math.round((goal.current / goal.target) * 100);
          return (
            <Card key={goal.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>{goal.icon}</span> {goal.name}
                  </CardTitle>
                </div>
                <CardDescription>
                  {goal.currency} {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
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
    </div>
  );
}
