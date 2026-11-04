"use client";

import { useState, useTransition } from "react";
import { login, requestPasswordReset } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export function LoginForm() {
  const [error, setError] = useState<string | undefined>();
  const [info, setInfo] = useState<string | undefined>();
  const [forgot, setForgot] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setInfo(undefined);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      if (forgot) {
        const res = await requestPasswordReset(String(formData.get("email") ?? ""));
        setError(res.error);
        setInfo(res.info);
        return;
      }
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
        <CardDescription>
          Ingresa a tu cuenta para ver sus finanzas
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" required disabled={isPending} />
          </div>
          {!forgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => { setForgot(true); setError(undefined); }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={isPending} />
            </div>
          )}
          {error && <p className="text-sm text-destructive text-center" role="alert">{error}</p>}
          {info && <p className="text-sm text-emerald-600 text-center" role="status">{info}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {forgot
              ? isPending ? "Enviando..." : "Enviar enlace de recuperación"
              : isPending ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
          {forgot && (
            <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => { setForgot(false); setInfo(undefined); }}>
              Volver a iniciar sesión
            </button>
          )}
          <p className="text-sm text-center text-muted-foreground">
            ¿No tienes cuenta? <Link href="/register" className="underline">Regístrate</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
