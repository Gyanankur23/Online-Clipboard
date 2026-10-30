import { Redis } from "@upstash/redis";
import { ExpiryMode, EXPIRY_OPTIONS } from "./constants";

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

export type { ExpiryMode } from "./constants";
export { EXPIRY_OPTIONS };

/**
 * 1. FIX: Ephemeral 6-digit alias configuration for mobile-to-desktop typing
 */
export async function createCodeAlias(code: string, storageId: string, expiryMode: ExpiryMode): Promise<void> {
  const expiryOption = EXPIRY_OPTIONS.find((o) => o.value === expiryMode) || { seconds: 180 };
  // Short codes should expire rapidly (e.g. 3 minutes max)
  await redis.setex(`alias:${code}`, expiryOption.seconds, storageId);
}

export async function resolveCodeAlias(code: string): Promise<string | null> {
  return await redis.get<string>(`alias:${code}`);
}

/**
 * 2. Store clipboard payload using high-entropy UUIDs
 */
export async function storeClipboardEntry(
  storageId: string,
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

    await redis.setex(`clipboard:${storageId}`, ttlSeconds, JSON.stringify(entryWithMeta));
    return true;
  } catch (error) {
    console.error("[Redis] storeClipboardEntry error:", error);
    return false;
  }
}

/**
 * 3. FIX: Atomic Read-and-Destroy Lua script configuration to defeat race conditions
 */
export async function getClipboardEntry(storageId: string): Promise<ClipboardEntry | null> {
  try {
    const key = `clipboard:${storageId}`;

    // LUA Script executed natively on Upstash cluster infrastructure
    const luaScript = `
      local data = redis.call('GET', KEYS[1])
      if not data then return nil end
      
      local entry = json.decode(data)
      if entry['maxViews'] == 1 then
        redis.call('DEL', KEYS[1])
      end
      return data
    `;

    // Execute atomically
    const rawData = await redis.eval(luaScript, [key], []);
    
    if (!rawData) return null;

    return typeof rawData === 'string' ? JSON.parse(rawData) : (rawData as ClipboardEntry);
  } catch (error) {
    console.error("[Redis] getClipboardEntry error:", error);
    return null;
  }
}

export async function deleteClipboardEntry(storageId: string): Promise<boolean> {
  try {
    await redis.del(`clipboard:${storageId}`);
    return true;
  } catch (error) {
    return false;
  }
}

export async function checkCodeExists(code: string): Promise<boolean> {
  const exists = await redis.exists(`alias:${code}`);
  return exists === 1;
}

export async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (!(await checkCodeExists(code))) return code;
    attempts++;
  }
  return (Date.now() % 1000000).toString().padStart(6, "0");
}
