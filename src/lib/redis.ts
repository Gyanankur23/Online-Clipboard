import { Redis } from "@upstash/redis";
import { ExpiryMode, EXPIRY_OPTIONS } from "./constants";

// Redis client for temporary clipboard storage
// Uses SETEX for automatic TTL (expiration)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export interface ClipboardEntry {
  encrypted: {
    ciphertext: string;
    iv: string;
    tag: string;
  };
  salt: string;
  type: "text" | "file" | "image";
  filename?: string;
  mimeType?: string;
  expiresAt: number;
  maxViews?: number;
  viewCount?: number;
}

// Re-export for backward compatibility
export type { ExpiryMode } from "./constants";
export { EXPIRY_OPTIONS };

export async function storeClipboardEntry(
  code: string,
  entry: Omit<ClipboardEntry, "expiresAt" | "viewCount">,
  expiryMode: ExpiryMode
): Promise<boolean> {
  try {
    const expiryOption = EXPIRY_OPTIONS.find((o) => o.value === expiryMode);
    if (!expiryOption) return false;

    const ttlSeconds = expiryOption.seconds;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const entryWithMeta: ClipboardEntry = {
      ...entry,
      expiresAt,
      viewCount: 0,
      maxViews: expiryMode === "1view" ? 1 : undefined,
    };

    // Use SETEX to store with TTL - Redis will auto-delete after expiry
    await redis.setex(`clipboard:${code}`, ttlSeconds, JSON.stringify(entryWithMeta));

    return true;
  } catch (error) {
    console.error("Redis store error:", error);
    return false;
  }
}

export async function getClipboardEntry(
  code: string
): Promise<ClipboardEntry | null> {
  try {
    const data = await redis.get<string>(`clipboard:${code}`);
    if (!data) return null;

    const entry: ClipboardEntry = JSON.parse(data);

    // Check if single-view and already viewed
    if (entry.maxViews === 1 && entry.viewCount && entry.viewCount >= 1) {
      // Already viewed, delete it
      await redis.del(`clipboard:${code}`);
      return null;
    }

    // Increment view count for single-view items
    if (entry.maxViews === 1) {
      entry.viewCount = (entry.viewCount || 0) + 1;
      // Update with remaining TTL
      const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await redis.setex(`clipboard:${code}`, ttl, JSON.stringify(entry));
      }
    }

    return entry;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function deleteClipboardEntry(code: string): Promise<boolean> {
  try {
    await redis.del(`clipboard:${code}`);
    return true;
  } catch (error) {
    console.error("Redis delete error:", error);
    return false;
  }
}

export async function checkCodeExists(code: string): Promise<boolean> {
  try {
    const exists = await redis.exists(`clipboard:${code}`);
    return exists === 1;
  } catch (error) {
    console.error("Redis exists error:", error);
    return false;
  }
}

export async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const exists = await checkCodeExists(code);
    if (!exists) {
      return code;
    }
    attempts++;
  }

  // Fallback: use timestamp + random to ensure uniqueness
  return (Date.now() % 1000000).toString().padStart(6, "0");
}
