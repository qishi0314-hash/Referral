import { cookies } from "next/headers";

const STAFF_COOKIE = "cps_staff_session";

export function getStaffPassword(): string {
  return process.env.STAFF_PASSWORD || "fordham-cps-staff";
}

export async function isStaffAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE)?.value;
  return token === getStaffPassword();
}

export { STAFF_COOKIE };
