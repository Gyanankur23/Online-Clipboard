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
    console.log(`[Redis] Storing clipboard: ${code}, mode: ${expiryMode}`);
    
    const expiryOption = EXPIRY_OPTIONS.find((o) => o.value === expiryMode);
    if (!expiryOption) {
      console.error(`[Redis] Invalid expiry mode: ${expiryMode}`);
      return false;
    }

    const ttlSeconds = expiryOption.seconds;
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const entryWithMeta: ClipboardEntry = {
      ...entry,
      expiresAt,
      viewCount: 0,
      maxViews: expiryMode === "1view" ? 1 : undefined,
    };

    console.log(`[Redis] Entry data: maxViews=${entryWithMeta.maxViews}, viewCount=${entryWithMeta.viewCount}, TTL=${ttlSeconds}s`);

    // Use SETEX to store with TTL - Redis will auto-delete after expiry
    await redis.setex(`clipboard:${code}`, ttlSeconds, JSON.stringify(entryWithMeta));
    
    console.log(`[Redis] Successfully stored: ${code}`);

    return true;
  } catch (error) {
    console.error("[Redis] storeClipboardEntry error:", error);
    return false;
  }
}

export async function getClipboardEntry(
  code: string
): Promise<ClipboardEntry | null> {
  try {
    console.log(`[Redis] Getting clipboard: ${code}`);
    const data = await redis.get<string | ClipboardEntry>(`clipboard:${code}`);
    if (!data) {
      console.log(`[Redis] No data found for: ${code}`);
      return null;
    }

    // Handle both string (needs parsing) and object (already parsed)
    let entry: ClipboardEntry;
    if (typeof data === 'string') {
      entry = JSON.parse(data);
    } else {
      entry = data as ClipboardEntry;
    }
    console.log(`[Redis] Found entry: ${code}, maxViews: ${entry.maxViews}, viewCount: ${entry.viewCount}, expires: ${new Date(entry.expiresAt).toISOString()}`);

    // Check if single-view and already viewed
    if (entry.maxViews === 1 && entry.viewCount != null && entry.viewCount >= 1) {
      console.log(`[Redis] Single-view already accessed: ${code}`);
      // Already viewed, delete it
      await redis.del(`clipboard:${code}`);
      return null;
    }

    // Increment view count for single-view items
    if (entry.maxViews === 1) {
      entry.viewCount = (entry.viewCount ?? 0) + 1;
      console.log(`[Redis] Incrementing viewCount to ${entry.viewCount} for: ${code}`);
      // Update with remaining TTL
      const ttl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      console.log(`[Redis] Updating TTL: ${ttl}s for: ${code}`);
      if (ttl > 0) {
        await redis.setex(`clipboard:${code}`, ttl, JSON.stringify(entry));
      }
    }

    return entry;
  } catch (error) {
    console.error("[Redis] getClipboardEntry error:", error);
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
483767
