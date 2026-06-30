import { NextRequest, NextResponse } from "next/server";

import { isStaffAuthenticated } from "@/lib/auth";
import { addComment, deleteComment } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { author_name, body } = await request.json();

  if (!author_name?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Author name and comment are required" }, { status: 400 });
  }

  const comment = addComment(parseInt(id, 10), author_name, body);
  if (!comment) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }
  return NextResponse.json(comment, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const commentId = parseInt(searchParams.get("commentId") || "", 10);
  if (!commentId) {
    return NextResponse.json({ error: "commentId required" }, { status: 400 });
  }

  const ok = deleteComment(commentId);
  if (!ok) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
