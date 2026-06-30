import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_COOKIE,
  getAuthRole,
  getEditorPassword,
  getStaffPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  let role: "staff" | "editor" | null = null;
  let token: string | null = null;

  if (password === getEditorPassword()) {
    role = "editor";
    token = getEditorPassword();
  } else if (password === getStaffPassword()) {
    role = "staff";
    token = getStaffPassword();
  }

  if (!role || !token) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    role,
    canEdit: role === "editor",
    canComment: true,
  });

  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return response;
}

export async function GET() {
  const role = await getAuthRole();
  return NextResponse.json({
    authenticated: role !== null,
    role,
    canEdit: role === "editor",
    canComment: role !== null,
  });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
