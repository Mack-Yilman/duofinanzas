import { LoginForm } from "@/components/login-form";
import { RedirectIfAuthed } from "@/components/redirect-if-authed";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 className="sr-only">Iniciar sesión</h1>
      <RedirectIfAuthed />
      <LoginForm />
    </AuthShell>
  );
}
