import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addGoalAction } from "@/app/actions/goals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function NewGoalPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Meta</h1>
        <p className="text-muted-foreground mt-2">Creen juntos un nuevo objetivo de ahorro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Meta</CardTitle>
          <CardDescription>¿Para qué están ahorrando?</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addGoalAction} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2">
                <Label htmlFor="icon">Icono</Label>
                <Input id="icon" name="icon" placeholder="✈️" defaultValue="🎯" required />
              </div>
              <div className="col-span-3 space-y-2">
                <Label htmlFor="name">Nombre de la Meta</Label>
                <Input id="name" name="name" placeholder="Ej. Viaje a Cancún" required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Monto Objetivo</Label>
                <Input id="targetAmount" name="targetAmount" type="number" step="0.01" placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select name="currency" defaultValue="PEN">
                  <SelectTrigger>
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Fecha Objetivo</Label>
              <Input id="targetDate" name="targetDate" type="date" required />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Link href="/goals">
                <Button variant="outline" type="button">Cancelar</Button>
              </Link>
              <Button type="submit">Guardar Meta</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
