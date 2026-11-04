import { supabase, unwrap } from "../supabase/client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  coupleId: string | null;
  coupleName: string | null;
  role: string;
  isAdmin: boolean;
  emailConfirmed: boolean;
  banned: boolean;
  createdAt: Date;
  lastSignInAt: Date | null;
}

export interface AdminStats {
  users: number;
  couples: number;
  expenses: number;
  active7d: number;
}

export interface AuditEntry {
  id: number;
  adminEmail: string | null;
  action: string;
  targetUser: string | null;
  detail: Record<string, unknown>;
  createdAt: Date;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listUsers(): Promise<AdminUser[]> {
  const rows = unwrap(await supabase.rpc("admin_list_users")) as any[];
  return (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    coupleId: r.couple_id,
    coupleName: r.couple_name,
    role: r.role,
    isAdmin: r.is_admin,
    emailConfirmed: r.email_confirmed,
    banned: r.banned,
    createdAt: new Date(r.created_at),
    lastSignInAt: r.last_sign_in_at ? new Date(r.last_sign_in_at) : null,
  }));
}

export async function getStats(): Promise<AdminStats> {
  return unwrap(await supabase.rpc("admin_stats")) as AdminStats;
}

export async function getAuditLog(limit = 50): Promise<AuditEntry[]> {
  const rows = unwrap(await supabase.rpc("admin_audit_log", { p_limit: limit })) as any[];
  return (rows ?? []).map((r) => ({
    id: r.id,
    adminEmail: r.admin_email,
    action: r.action,
    targetUser: r.target_user,
    detail: r.detail ?? {},
    createdAt: new Date(r.created_at),
  }));
}

export async function setBanned(userId: string, banned: boolean) {
  unwrap(await supabase.rpc("admin_set_banned", { p_user: userId, p_banned: banned }));
}

export async function removeFromCouple(userId: string) {
  unwrap(await supabase.rpc("admin_remove_from_couple", { p_user: userId }));
}

export async function setAdmin(userId: string, admin: boolean) {
  unwrap(await supabase.rpc("admin_set_admin", { p_user: userId, p_admin: admin }));
}

export async function deleteUser(userId: string) {
  unwrap(await supabase.rpc("admin_delete_user", { p_user: userId }));
}

/** Envía al usuario un correo para restablecer su contraseña. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectUrl() });
  if (error) throw new Error(error.message);
}

export function resetRedirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/reset-password/`;
}

export interface Invitation {
  email: string;
  invitedByEmail: string | null;
  createdAt: Date;
  lastSentAt: Date;
  sendCount: number;
  status: "pending" | "accepted" | "revoked";
}

export async function listInvitations(): Promise<Invitation[]> {
  const rows = unwrap(await supabase.rpc("admin_list_invitations")) as any[];
  return (rows ?? []).map((r) => ({
    email: r.email,
    invitedByEmail: r.invited_by_email,
    createdAt: new Date(r.created_at),
    lastSentAt: new Date(r.last_sent_at),
    sendCount: r.send_count,
    status: r.status,
  }));
}

/** Invita (o reenvía) vía la Edge Function `admin-invite`, que verifica el rol admin. */
export async function inviteUser(email: string) {
  const { data, error } = await supabase.functions.invoke("admin-invite", { body: { email } });
  if (error) {
    // El cuerpo del error trae el mensaje legible de la función.
    let message = "No se pudo enviar la invitación.";
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message);
  }
  return data;
}

export async function revokeInvitation(email: string) {
  unwrap(await supabase.rpc("admin_revoke_invitation", { p_email: email }));
}
