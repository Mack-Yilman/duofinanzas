/**
 * Tailwind solo genera clases que aparecen literalmente en el código, por eso
 * `bg-${color}-500` nunca funcionaba. Mapa estático de colores permitidos.
 */
const AVATAR_BG: Record<string, string> = {
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
};

export function avatarBg(color?: string) {
  return AVATAR_BG[color || ""] || AVATAR_BG.indigo;
}
