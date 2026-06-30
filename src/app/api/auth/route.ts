import { NextRequest, NextResponse } from "next/server";

import { STAFF_COOKIE, getStaffPassword, isStaffAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (password !== getStaffPassword()) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(STAFF_COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}

export async function GET() {
  const authed = await isStaffAuthenticated();
  return NextResponse.json({ authenticated: authed });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(STAFF_COOKIE);
  return response;
}
