"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe } from "@/components/auth-provider";
import { setupCouple } from "@/lib/actions/auth";

export default function SetupPage() {
  const router = useRouter();
  const { data: me, isLoading } = useMe();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isLoading) return;
    if (!me || me.mfaPending) router.replace("/login");
    else if (me.coupleId) router.replace("/");
  }, [me, isLoading, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await setupCouple(formData);
      setError(res.error);
    });
  }

  return (
    <AuthShell>
      <Card className="w-full">
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="action" value="create" />
                <div className="space-y-2">
                  <Label htmlFor="coupleName">Nombre de su Espacio</Label>
                  <Input id="coupleName" name="coupleName" placeholder="Ej. Juan y Maria" required disabled={isPending} />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creando..." : "Crear Espacio y Obtener Código"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="action" value="join" />
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Código de Invitación</Label>
                  <Input id="inviteCode" name="inviteCode" placeholder="DUO-ABC123" required disabled={isPending} />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Conectando..." : "Conectar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {error && <p className="mt-4 text-sm text-destructive text-center" role="alert">{error}</p>}
          {me?.isAdmin && (
            <p className="mt-6 text-center text-sm">
              <Link href="/admin" className="underline">Ir al panel de administración</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
