import { NextRequest, NextResponse } from "next/server";
import {
  storeClipboardEntry,
  generateUniqueCode,
  checkCodeExists,
  type ExpiryMode,
} from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code: clientCode,
      encrypted,
      salt,
      type,
      filename,
      mimeType,
      expiryMode = "10min",
    } = body;

    // Validate required fields
    if (!clientCode || !encrypted || !salt || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(clientCode)) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    // Check if code already exists, if so generate a new unique one
    let code = clientCode;
    const exists = await checkCodeExists(code);
    if (exists) {
      code = await generateUniqueCode();
    }

    // Store in Redis with TTL
    const success = await storeClipboardEntry(code, {
      encrypted,
      salt,
      type,
      filename,
      mimeType,
    }, expiryMode as ExpiryMode);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to store clipboard entry" },
        { status: 500 }
      );
    }

    // Generate the magic link
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const fragment = Buffer.from(JSON.stringify({ code, salt })).toString('base64');
    const magicLink = `${baseUrl}/retrieve/${code}#${fragment}`;

    return NextResponse.json({
      success: true,
      code,
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
