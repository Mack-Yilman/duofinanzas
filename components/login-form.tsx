"use client";

import { useState, useTransition } from "react";
import { login } from "@/app/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export function LoginForm() {
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="w-full max-w-sm shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">DúoFinanzas</CardTitle>
        <CardDescription>
          Ingresa a tu cuenta para ver sus finanzas
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="tu@email.com" required disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required disabled={isPending} />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            ¿No tienes cuenta? <Link href="/register" className="underline">Regístrate</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
