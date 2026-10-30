import { NextRequest, NextResponse } from "next/server";
import { crypto } from "next/dist/compiled/@edge-runtime/primitives"; // Edge safe crypto
import {
  storeClipboardEntry,
  createCodeAlias,
  type ExpiryMode,
} from "@/lib/redis";

// Enforce Edge Runtime compatibility
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientCode, // The optional 6-digit display code for manual typing
      encrypted,
      salt,
      type,
      filename,
      mimeType,
      expiryMode = "10min",
    } = body;

    // Validate core payload requirements
    if (!encrypted || !salt || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. FIX: Generate a cryptographically secure UUID for database isolation
    const storageId = globalThis.crypto.randomUUID();

    // 2. Store the primary encrypted payload using the high-entropy storageId
    const success = await storeClipboardEntry(storageId, {
      encrypted,
      type,
      filename,
      mimeType,
      expiryMode
    }, expiryMode as ExpiryMode);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to store clipboard entry" },
        { status: 500 }
      );
    }

    // 3. FIX: Handle the 6-digit mobile handoff code purely as a short-lived alias
    let code = clientCode;
    if (code && /^\d{6}$/.test(code)) {
      // Map the 6-digit code to the storageId with a strict 3-minute TTL max
      await createCodeAlias(code, storageId, "3min");
    } else {
      code = null; 
    }

    // 4. FIX: Edge-compliant Base64 utility (Avoids using Node's Buffer API)
    const fragmentData = JSON.stringify({ storageId, salt });
    const encodedFragment = btoa(encodeURIComponent(fragmentData));

    // 5. Build secure magic link (The true database ID stays in the non-server-readable hash)
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const magicLink = `${baseUrl}/retrieve#${encodedFragment}`;

    return NextResponse.json({
      success: true,
      code, // Returned only for manual cross-device entry displays
      magicLink,
      expiresIn: expiryMode,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
