import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SetupPage() {
  const session = await auth();
  
  // Si ya tiene pareja configurada, lo mandamos al dashboard
  if ((session?.user as any)?.coupleId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bienvenido a DúoFinanzas</CardTitle>
          <CardDescription>Para empezar, necesitas conectar con tu pareja.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Crear Pareja</TabsTrigger>
              <TabsTrigger value="join">Unirme</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 pt-4">
              <form action={setupAction} className="space-y-4">
                <input type="hidden" name="action" value="create" />
                <div className="space-y-2">
                  <Label htmlFor="coupleName">Nombre de su Espacio</Label>
                  <Input id="coupleName" name="coupleName" placeholder="Ej. Juan y Maria" required />
                </div>
                <Button type="submit" className="w-full">Crear Espacio y Obtener Código</Button>
              </form>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 pt-4">
              <form action={setupAction} className="space-y-4">
                <input type="hidden" name="action" value="join" />
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Código de Invitación</Label>
                  <Input id="inviteCode" name="inviteCode" placeholder="DUO-ABCD" required />
                </div>
                <Button type="submit" className="w-full">Conectar</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
