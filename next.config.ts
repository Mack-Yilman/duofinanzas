import type { NextConfig } from "next";

/**
 * Export 100 % estático para GitHub Pages.
 *  - NEXT_PUBLIC_BASE_PATH: subruta del repo en Pages (p. ej. "/duofinanzas").
 *    Vacío en local o con dominio propio.
 *  - Sin servidor: datos y auth van directo del navegador a Supabase (RLS).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
