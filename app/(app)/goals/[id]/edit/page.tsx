import { getGoal } from "@/lib/repos/goals";
import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { updateGoalAction } from "@/app/actions/goals";

export default async function EditGoalPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const goal = await getGoal(params.id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Meta</h1>
        <p className="text-muted-foreground mt-2">Modifica los objetivos financieros.</p>
      </div>

      <Card>
        <form action={updateGoalAction}>
          <input type="hidden" name="id" value={goal.id} />
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Meta</Label>
              <Input id="name" name="name" defaultValue={goal.name} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Monto Objetivo</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" min="1" defaultValue={goal.targetAmount} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select name="currency" defaultValue={goal.currency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="EUR">Euros (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icono (Emoji)</Label>
              <Input id="icon" name="icon" defaultValue={goal.icon} required maxLength={2} />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Link href="/goals">
                <Button variant="outline" type="button">Cancelar</Button>
              </Link>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
