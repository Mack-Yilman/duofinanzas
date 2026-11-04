"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/auth-provider";

/** En /login y /register: si ya hay sesión, ir al dashboard (o a /setup sin pareja). */
export function RedirectIfAuthed() {
  const router = useRouter();
  const { data: me } = useMe();
  useEffect(() => {
    if (me) router.replace(me.coupleId ? "/" : "/setup");
  }, [me, router]);
  return null;
}
