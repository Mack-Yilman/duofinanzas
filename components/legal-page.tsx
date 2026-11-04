import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";
import { ThemeToggle } from "@/components/theme-toggle";
import { LegalFooter } from "@/components/legal-footer";

/** Plantilla pública (sin sesión) para las páginas legales. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {LEGAL.appName}
          </Link>
          <ThemeToggle compact />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versión {LEGAL.version} · Última actualización: {LEGAL.updatedAt}
        </p>
        <article className="legal-prose mt-8">{children}</article>
        <p className="mt-10 rounded-xl bg-muted p-4 text-xs text-muted-foreground">
          Este documento es informativo y fue redactado para un servicio privado y gratuito. No constituye asesoría
          legal; se recomienda su revisión por un profesional antes de un uso comercial.
        </p>
        <LegalFooter className="mt-8" />
      </main>
    </div>
  );
}
