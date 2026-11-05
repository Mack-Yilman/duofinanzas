import type { Metadata, Viewport } from "next";
import { Outfit, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/auth-provider";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";

/**
 * Origen exacto de Supabase para la CSP (no `*.supabase.co`): si alguien lograra inyectar
 * código, no podría enviar datos a OTRO proyecto de Supabase.
 */
function supabaseOrigin(): { https: string; wss: string } {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { https: u.origin, wss: `${u.protocol === "http:" ? "ws:" : "wss:"}//${u.host}` };
  } catch {
    return { https: "https://*.supabase.co", wss: "wss://*.supabase.co" };
  }
}
const SB = supabaseOrigin();

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Serif de display para titulares. Sin ejes variables extra (SOFT/WONK no se usaban
// y aumentaban el peso de la fuente descargada).
const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

// Mono tabular para cifras y montos, para que las columnas de dinero alineen.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "DúoFinanzas",
  description: "App de Finanzas en Pareja",
  applicationName: "DúoFinanzas",
  appleWebApp: { capable: true, title: "DúoFinanzas", statusBarStyle: "default" },
  icons: {
    icon: [{ url: `${BASE}/icons/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${BASE}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14130e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* GitHub Pages no permite cabeceras HTTP propias: la CSP va como meta.
            Solo se permiten conexiones al proyecto de Supabase y a la API de tipos de cambio. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            `img-src 'self' data: blob: ${SB.https}`,
            "font-src 'self' data:",
            `connect-src 'self' ${SB.https} ${SB.wss} https://api.frankfurter.dev`,
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; ")}
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        {/* Anti-clickjacking: Pages no envía X-Frame-Options y `frame-ancestors` no funciona en <meta>.
            Si la app se carga dentro de un iframe ajeno, sale de él. */}
        <script
          dangerouslySetInnerHTML={{ __html: "if(window.top!==window.self){window.top.location=window.self.location.href}" }}
        />
      </head>
      <body suppressHydrationWarning className={`${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppProviders>{children}</AppProviders>
          <Toaster richColors position="top-center" />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
