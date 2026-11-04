/**
 * Puente de navegación para funciones fuera de React (acciones). El AuthProvider
 * registra `router.push` de Next al montarse.
 */
type Push = (href: string) => void;
let push: Push = (href) => {
  if (typeof window !== "undefined") window.location.assign((process.env.NEXT_PUBLIC_BASE_PATH || "") + href);
};

export function setNavigator(fn: Push) {
  push = fn;
}

export function navigate(href: string) {
  push(href);
}
