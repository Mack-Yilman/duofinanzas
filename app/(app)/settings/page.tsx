import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions/auth";
import { getCouple } from "@/lib/repos/couples";
import { FxRateForm } from "./fx-rate-form";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const coupleId = (session.user as any).coupleId;
  const couple = await getCouple(coupleId);

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
            <CardDescription>Información de tu usuario y grupo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-muted-foreground">{session.user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Correo Electrónico</p>
              <p className="text-muted-foreground">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Código de Invitación (Pareja)</p>
              <div className="flex items-center gap-4 mt-1">
                <code className="px-3 py-1 bg-muted rounded-md text-sm font-mono">{couple.inviteCode}</code>
                <p className="text-xs text-muted-foreground">Comparte este código con tu pareja para que se una.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración Financiera</CardTitle>
            <CardDescription>Ajusta cómo se calculan tus saldos.</CardDescription>
          </CardHeader>
          <CardContent>
            <FxRateForm initialRate={couple.fxRate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de Datos</CardTitle>
            <CardDescription>Personaliza tu experiencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/categories">
              <Button variant="outline">Gestionar Categorías</Button>
            </Link>
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
