import { NextRequest, NextResponse } from "next/server";
import { getClipboardEntry, deleteClipboardEntry } from "@/lib/redis";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    const entry = await getClipboardEntry(code);

    if (!entry) {
      return NextResponse.json(
        { error: "Clipboard not found or expired" },
        { status: 404 }
      );
    }

    // Return encrypted data and salt (client will decrypt)
    return NextResponse.json({
      encrypted: entry.encrypted,
      salt: entry.salt,
      type: entry.type,
      filename: entry.filename,
      mimeType: entry.mimeType,
      expiresAt: entry.expiresAt,
      maxViews: entry.maxViews,
      viewCount: entry.viewCount,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    const success = await deleteClipboardEntry(code);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete clipboard" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
