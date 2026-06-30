import { cookies } from "next/headers";

export const AUTH_COOKIE = "cps_auth_session";

export type AuthRole = "staff" | "editor";

export function getStaffPassword(): string {
  return process.env.STAFF_PASSWORD || "fordham-cps-staff";
}

export function getEditorPassword(): string {
  return process.env.EDITOR_PASSWORD || "fordham-cps-editor";
}

export async function getAuthRole(): Promise<AuthRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  if (token === getEditorPassword()) return "editor";
  if (token === getStaffPassword()) return "staff";
  return null;
}

export async function isStaffAuthenticated(): Promise<boolean> {
  const role = await getAuthRole();
  return role === "staff" || role === "editor";
}

export async function isEditorAuthenticated(): Promise<boolean> {
  return (await getAuthRole()) === "editor";
}

// Legacy alias used during migration
export const STAFF_COOKIE = AUTH_COOKIE;
