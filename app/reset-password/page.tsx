"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { setNewPassword } from "@/lib/actions/auth";

/** Destino del enlace de recuperación: Supabase crea una sesión temporal desde la URL. */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setReady(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password !== String(fd.get("confirm") ?? "")) return setError("Las contraseñas no coinciden.");
    startTransition(async () => setError((await setNewPassword(password)).error));
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
          <CardDescription>Elige una contraseña de al menos 8 caracteres.</CardDescription>
        </CardHeader>
        {ready === false ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.
            </p>
            <Link href="/login" className="text-sm underline">Ir a iniciar sesión</Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required disabled={isPending || !ready} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Repetir contraseña</Label>
                <Input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required disabled={isPending || !ready} />
              </div>
              {error && <p className="text-sm text-destructive text-center" role="alert">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending || !ready}>
                {isPending ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
