import { NextRequest, NextResponse } from "next/server";

import { isEditorAuthenticated } from "@/lib/auth";
import { getProvider, updateProvider } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const provider = await getProvider(parseInt(id, 10));
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(provider);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isEditorAuthenticated())) {
    return NextResponse.json({ error: "Editor access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updated = await updateProvider(parseInt(id, 10), body);
  if (!updated) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
