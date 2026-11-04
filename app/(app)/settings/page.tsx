"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateCutoffDayAction, changePasswordAction } from "@/lib/actions/settings";
import { Input } from "@/components/ui/input";
import { useMe } from "@/components/auth-provider";
import { useCoupleData } from "@/lib/couple-data";
import { PageError, PageSkeleton } from "@/components/page-state";
import { FxRateForm } from "./fx-rate-form";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

export default function SettingsPage() {
  const { data: me } = useMe();
  const { data, isLoading, error } = useCoupleData(me?.coupleId);

  if (error) return <PageError error={error} />;
  if (isLoading || !data || !me) return <PageSkeleton />;
  const { couple } = data;

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
              <p className="text-muted-foreground">{me.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Correo Electrónico</p>
              <p className="text-muted-foreground">{me.email}</p>
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
          <CardContent className="space-y-6">
            {/* key: al cambiar la tasa guardada se remonta el form con el nuevo valor */}
            <FxRateForm key={couple.fxRate} initialRate={couple.fxRate} />

            <form key={couple.cutoffDay} action={updateCutoffDayAction} className="space-y-2 max-w-sm border-t border-border/60 pt-6">
              <Label htmlFor="cutoffDay">Día de corte del periodo</Label>
              <div className="flex gap-2">
                <input
                  id="cutoffDay"
                  name="cutoffDay"
                  type="number"
                  min={1}
                  max={31}
                  step={1}
                  defaultValue={couple.cutoffDay}
                  required
                  className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button type="submit">Guardar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El &ldquo;mes financiero&rdquo; va de este día al mismo día del mes siguiente (ej. 15 = quincena a
                quincena, 1 = mes calendario). Si el mes no tiene ese día, se ajusta al último.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de Datos</CardTitle>
            <CardDescription>Personaliza tu experiencia.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/categories" className={buttonVariants({ variant: "outline" })}>
              Gestionar Categorías
            </Link>
          </CardContent>
        </Card>

        {me.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Administración</CardTitle>
              <CardDescription>Gestiona las cuentas de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin" className={buttonVariants()}>Abrir panel de administración</Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
            <CardDescription>Mínimo 8 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changePasswordAction} className="space-y-3 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Repetir contraseña</Label>
                <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required />
              </div>
              <Button type="submit">Actualizar contraseña</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cerrar Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
