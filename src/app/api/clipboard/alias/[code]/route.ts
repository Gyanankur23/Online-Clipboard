import { NextRequest, NextResponse } from "next/server";
import { resolveCodeAlias } from "@/lib/redis";

export const runtime = "edge";

type RouteParams = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid short-code layout query structure." }, { status: 400 });
    }

    // Lookup the storage reference UUID mapped in your Redis engine
    const storageId = await resolveCodeAlias(code);

    if (!storageId) {
      return NextResponse.json({ error: "Active clipboard entry matching code not found or expired." }, { status: 404 });
    }

    // Return the mapping value so the frontend client context can pull the real resource record
    return NextResponse.json({ storageId }, { status: 200 });
  } catch (error) {
    console.error("Alias Lookup Error:", error);
    return NextResponse.json({ error: "Internal server validation engine execution error." }, { status: 500 });
  }
}
