/**
 * Datos legales (Ley N.º 29733 – Protección de Datos Personales, Perú).
 * Titular: persona natural. Mantén el domicilio completo (distrito/provincia) si cambia.
 * Si cambias el contenido de las políticas, sube `version`: se pedirá de nuevo
 * el consentimiento a todos los usuarios.
 */
export const LEGAL = {
  version: "2026-11-04",
  updatedAt: "4 de noviembre de 2026",
  appName: "DúoFinanzas",
  owner: {
    name: "Mack Chirinos Quispe",
    dni: "[REDACTADO]",
    address: "Av. Lima, Perú",
    email: "mack.yilman@gmail.com",
  },
  hosting: {
    database: "Supabase Inc. — servidores en Estados Unidos (región us-east-1)",
    web: "GitHub Pages (GitHub Inc., Estados Unidos)",
    fx: "Frankfurter (api.frankfurter.dev) — solo consulta de tipos de cambio, sin datos personales",
  },
  responseDays: 20,
} as const;
