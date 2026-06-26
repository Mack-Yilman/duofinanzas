import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-2">Configuración de tu cuenta y preferencias de la pareja.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Información de tu usuario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-muted-foreground">{session?.user?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Correo Electrónico</p>
              <p className="text-muted-foreground">{session?.user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cerrar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logoutAction}>
              <Button variant="destructive" type="submit">Cerrar Sesión</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
