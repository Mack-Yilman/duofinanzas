/**
 * Datos legales (Ley N.º 29733 – Protección de Datos Personales, Perú).
 * Titular: persona natural. El DNI no se publica; se entrega solo si una autoridad o un
 * titular de datos lo solicita formalmente.
 * Si cambias el contenido de las políticas, sube `version`: se pedirá de nuevo
 * el consentimiento a todos los usuarios.
 */
export const LEGAL = {
  version: "2026-11-05",
  updatedAt: "5 de noviembre de 2026",
  /** Las imágenes de constancias se eliminan automáticamente pasado este plazo. */
  receiptRetentionMonths: 12,
  appName: "DúoFinanzas",
  /** Año del aviso de copyright (ver LICENSE: todos los derechos reservados). */
  copyrightYear: 2026,
  owner: {
    name: "Mack Chirinos",
    address: "Av. Lima Sur Nº 186, Perú",
    email: "mack.yilman@gmail.com",
  },
  hosting: {
    database: "Supabase Inc. — servidores en Estados Unidos (región us-east-1)",
    web: "GitHub Pages (GitHub Inc., Estados Unidos)",
    fx: "Frankfurter (api.frankfurter.dev) — solo consulta de tipos de cambio, sin datos personales",
  },
  responseDays: 20,
} as const;
