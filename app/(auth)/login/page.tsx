import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Glows ambientales cálidos */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[45%] w-[45%] rounded-full bg-[var(--user-a)] opacity-[0.14] blur-[130px]" />
        <div className="absolute bottom-[-12%] right-[-8%] h-[45%] w-[45%] rounded-full bg-brand-600 opacity-[0.16] blur-[130px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-md">
            D
          </span>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Dúo<span className="text-primary">Finanzas</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Las finanzas de su hogar, en equilibrio.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
