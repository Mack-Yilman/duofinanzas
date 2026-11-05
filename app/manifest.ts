import type { MetadataRoute } from "next";

// Export estático: el manifest se genera una vez al compilar.
export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** PWA instalable (Android/escritorio; en iPhone: Compartir → “Añadir a pantalla de inicio”). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DúoFinanzas",
    short_name: "DúoFinanzas",
    description: "Finanzas en pareja, claras y justas.",
    id: `${base}/`,
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    lang: "es-PE",
    background_color: "#faf7f0",
    theme_color: "#1f5c3d",
    categories: ["finance", "productivity"],
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nuevo gasto", url: `${base}/expenses/new/`, icons: [{ src: `${base}/icons/icon-192.png`, sizes: "192x192" }] },
    ],
  };
}
