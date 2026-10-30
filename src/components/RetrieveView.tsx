"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Unlock,
  Loader2,
  Eye,
  Trash2,
  File,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  Download,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { decryptData } from "@/lib/crypto";
import { ClipboardContent } from "./UniversalInput";

interface RetrievedData {
  content: ClipboardContent;
  expiresAt: number;
  maxViews?: number;
  viewCount?: number;
}

interface RetrieveViewProps {
  prefillStorageId?: string | null;
  prefillSalt?: string | null;
}

export function RetrieveView({ prefillStorageId, prefillSalt }: RetrieveViewProps) {
  const [code, setCode] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrievedData, setRetrievedData] = useState<RetrievedData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Core retrieval engine handling high-entropy records
  const executeRetrieval = useCallback(async (targetStorageId: string, decryptionKey: string, salt: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch data payload using the highly unique database index ID reference
      const response = await fetch(`/api/clipboard/${targetStorageId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error(
            errorData.details || "Clipboard not found. It may have expired, been deleted, or already viewed."
          );
        }
        throw new Error(errorData.error || "Failed to retrieve clipboard storage reference configuration.");
      }

      const data = await response.json();

      // 2. Perform client-side decryption using high-entropy key context
      const decryptedJson = await decryptData(data.encrypted, decryptionKey, salt);
      const content: ClipboardContent = JSON.parse(decryptedJson);

      setRetrievedData({
        content,
        expiresAt: data.expiresAt,
        maxViews: data.maxViews,
        viewCount: data.viewCount,
      });
      setShowResult(true);
      setCode([]);

      // Auto-copy text utilities 
      if (content.type === "text" && content.content) {
        try {
          await navigator.clipboard.writeText(content.content);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch {
          // Fallback allowed
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger evaluation lifecycle loop from page contexts
  useEffect(() => {
    if (prefillStorageId && prefillSalt) {
      // Look for secret key inside window location hash fragment strings directly
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const searchParams = new URLSearchParams(hash.substring(1));
      const extractedKey = searchParams.get("key");

      if (extractedKey) {
        executeRetrieval(prefillStorageId, extractedKey, prefillSalt);
      } else {
        setError("Missing local decryption keys inside client fragment parameters.");
      }
    }
  }, [prefillStorageId, prefillSalt, executeRetrieval]);

  // Handle manual submissions from keyboard layouts or short code forms
  const handleManualLookupSubmit = useCallback(async () => {
    const inputString = urlInput.trim() || code.join("");
    
    // Check if input is a raw 6-digit numeric sequence string
    if (/^\d{6}$/.test(inputString)) {
      setIsLoading(true);
      setError(null);
      try {
        // Query the new helper endpoint to translate short codes into UUID storage IDs
        const aliasResponse = await fetch(`/api/clipboard/alias/${inputString}`);
        if (!aliasResponse.ok) {
          throw new Error("Invalid or expired 6-digit display lookup code.");
        }
        const { storageId } = await aliasResponse.json();
        
        // Note: For manual 6-digit handoffs, the code acts as both layout lookup and encryption base passphrase
        setIsLoading(false);
        executeRetrieval(storageId, inputString, inputString);
      } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
      }
      return;
    }

    // Check if it's a structural magic link URL instead
    try {
      const url = new URL(inputString);
      const hashFragment = url.hash.substring(1);
      const rawJson = decodeURIComponent(atob(hashFragment));
      const parsed = JSON.parse(rawJson);
      
      const subParams = new URLSearchParams(hashFragment);
      const extractedKey = subParams.get("key");

      if (parsed.storageId && parsed.salt && extractedKey) {
        executeRetrieval(parsed.storageId, extractedKey, parsed.salt);
      } else {
        throw new Error("Link structural metadata keys are missing properties.");
      }
    } catch (e) {
      setError("Invalid clipboard submission context framework format input.");
    }
  }, [urlInput, code, executeRetrieval]);

  const handleKeyPress = (key: string) => {
    if (code.length < 6 && !isLoading) {
      setCode((prev) => [...prev, key]);
      setError(null);
    }
  };

  const handleBackspace = () => {
    if (!isLoading) setCode((prev) => prev.slice(0, -1));
  };

  return (
    <div className="mx-auto max-w-xl p-4 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Retrieve Clipboard</h2>
        <p className="text-sm text-muted-foreground">
          Enter a 6-digit code or paste a secure magic link to decrypt entry.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          ref={urlInputRef}
          type="text"
          placeholder="Paste URL or type 6-digit code..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={isLoading}
          className="bg-card/50"
        />

        {urlInput.length === 0 && (
          <div className="flex justify-center gap-2 my-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-10 h-12 border rounded-lg bg-card/40 flex items-center justify-center font-bold text-lg"
              >
                {code[i] || ""}
              </div>
            ))}
          </div>
        )}

        {urlInput.length === 0 && (
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {[...Array(9)].map((_, i) => (
              <Button key={i + 1} variant="outline" onClick={() => handleKeyPress((i + 1).toString())}>
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setCode([])} className="text-xs text-destructive">CLR</Button>
            <Button variant="outline" onClick={() => handleKeyPress("0")}>0</Button>
            <Button variant="outline" onClick={handleBackspace}>⌫</Button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={handleManualLookupSubmit}
          className="w-full gap-2 mt-4"
          disabled={isLoading || (urlInput.length === 0 && code.length < 6)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing Decryption Layout...
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              Fetch & Decrypt Payload
            </>
          )}
        </Button>
      </div>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle>Decrypted Clipboard Content</DialogTitle>
            <DialogDescription>
              This raw cleartext is extracted entirely inside your browser sandbox runtime.
            </DialogDescription>
          </DialogHeader>

          {retrievedData && (
            <div className="space-y-4 pt-2">
              {retrievedData.content.type === "text" ? (
                <div className="relative rounded-lg border bg-muted p-4 font-mono text-sm max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {retrievedData.content.content}
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                  <File className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{retrievedData.content.filename}</p>
                    <p className="text-xs text-muted-foreground">{retrievedData.content.mimeType}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>Views Remaining: {retrievedData.maxViews === 1 ? "0 (Self Destructed)" : "Unlimited"}</span>
                <span>Expires: {new Date(retrievedData.expiresAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
);
}