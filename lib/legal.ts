/**
 * Datos legales (Ley N.º 29733 – Protección de Datos Personales, Perú).
 * ⚠️ Completa NOMBRE, DNI y DOMICILIO del titular antes de un uso público amplio.
 * Si cambias el contenido de las políticas, sube `version`: se pedirá de nuevo
 * el consentimiento a todos los usuarios.
 */
export const LEGAL = {
  version: "2026-11-04",
  updatedAt: "4 de noviembre de 2026",
  appName: "DúoFinanzas",
  owner: {
    name: "[Nombre completo del titular]",
    dni: "[DNI]",
    address: "[Domicilio], Perú",
    email: "mack.yilman@gmail.com",
  },
  hosting: {
    database: "Supabase Inc. — servidores en Estados Unidos (región us-east-1)",
    web: "GitHub Pages (GitHub Inc., Estados Unidos)",
    fx: "Frankfurter (api.frankfurter.dev) — solo consulta de tipos de cambio, sin datos personales",
  },
  responseDays: 20,
} as const;
