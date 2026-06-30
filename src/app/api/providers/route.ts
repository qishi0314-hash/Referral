import { NextRequest, NextResponse } from "next/server";

import { getFilterOptions, listProviders } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || undefined;
  const insurance = searchParams.getAll("insurance");
  const type = searchParams.getAll("type");
  const session_format = searchParams.getAll("session_format");
  const specialties = searchParams.getAll("specialties");
  const include_inactive = searchParams.get("include_inactive") === "true";
  const meta = searchParams.get("meta") === "true";

  if (meta) {
    return NextResponse.json(await getFilterOptions());
  }

  const providers = await listProviders({
    q,
    insurance: insurance.length ? insurance : undefined,
    type: type.length ? type : undefined,
    session_format: session_format.length ? session_format : undefined,
    specialties: specialties.length ? specialties : undefined,
    active_only: !include_inactive,
  });

  return NextResponse.json({ providers, count: providers.length });
}
