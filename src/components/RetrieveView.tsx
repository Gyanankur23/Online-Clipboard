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
import { decryptData, parseMagicLinkFragment } from "@/lib/crypto";
import { ClipboardContent } from "./UniversalInput";

interface RetrievedData {
  content: ClipboardContent;
  expiresAt: number;
  maxViews?: number;
  viewCount?: number;
}

export function RetrieveView() {
  const [code, setCode] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrievedData, setRetrievedData] = useState<RetrievedData | null>(
    null
  );
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [storedSalt, setStoredSalt] = useState<string | undefined>();
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Extract code and salt from URL or fragment
  const extractFromUrl = useCallback((url: string): { code: string; salt?: string } | null => {
    try {
      // Check if it's a full URL
      if (url.includes('/retrieve/')) {
        const codeMatch = url.match(/\/retrieve\/(\d{6})/);
        const hashMatch = url.match(/#(.+)$/);
        if (codeMatch) {
          const code = codeMatch[1];
          let salt: string | undefined;
          if (hashMatch) {
            const fragment = parseMagicLinkFragment(hashMatch[1]);
            if (fragment && fragment.code === code) {
              salt = fragment.salt;
            }
          }
          return { code, salt };
        }
      }
      
      // Check if it's just a 6-digit code
      const codeOnly = url.replace(/\D/g, '').match(/(\d{6})/);
      if (codeOnly) {
        return { code: codeOnly[1] };
      }
      
      return null;
    } catch {
      return null;
    }
  }, []);

  // Check URL fragment on mount (magic link handling)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      const fullUrl = window.location.href;
      
      // Try to extract from full URL first
      const extracted = extractFromUrl(fullUrl) || (hash ? extractFromUrl(`/#${hash}`) : null);
      
      if (extracted) {
        setCode(extracted.code.split(""));
        setUrlInput(extracted.code);
        // Store salt for decryption
        if (extracted.salt) {
          setStoredSalt(extracted.salt);
        }
      }
    }
  }, [extractFromUrl]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (code.length < 6 && !isLoading) {
        setCode((prev) => [...prev, key]);
        setError(null);
      }
    },
    [code.length, isLoading]
  );

  const handleBackspace = useCallback(() => {
    if (!isLoading) {
      setCode((prev) => prev.slice(0, -1));
      setError(null);
    }
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (!isLoading) {
      setCode([]);
      setUrlInput("");
      setStoredSalt(undefined);
      setError(null);
      urlInputRef.current?.focus();
    }
  }, [isLoading]);

  // Handle URL/code paste
  const handleUrlPaste = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);
    
    const extracted = extractFromUrl(value);
    if (extracted) {
      setCode(extracted.code.split(""));
      setError(null);
      if (extracted.salt) {
        setStoredSalt(extracted.salt);
      }
      // Auto-trigger retrieve after a short delay
      setTimeout(() => {
        if (extracted.code.length === 6) {
          handleRetrieve(extracted.code, extracted.salt);
        }
      }, 100);
    }
  }, [extractFromUrl]);

  const handleRetrieve = useCallback(
    async (manualCode?: string, manualSalt?: string) => {
      const targetCode = manualCode || code.join("");
      if (targetCode.length !== 6) {
        setError("Please enter a 6-digit code");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch encrypted data from server
        const response = await fetch(`/api/clipboard/${targetCode}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            throw new Error(
              errorData.details || "Clipboard not found. It may have expired, been deleted, or already viewed (if single-view mode)."
            );
          }
          throw new Error(errorData.error || "Failed to retrieve clipboard");
        }

        const data = await response.json();

        // Try to get salt from: 1) manualSalt param, 2) storedSalt state, 3) URL fragment, 4) server data
        let salt = manualSalt || storedSalt;
        if (!salt && typeof window !== "undefined") {
          const hash = window.location.hash.slice(1);
          if (hash) {
            const fragment = parseMagicLinkFragment(hash);
            if (fragment && fragment.code === targetCode) {
              salt = fragment.salt;
            }
          }
        }

        // Decrypt locally
        const finalSalt = salt || data.salt;
        if (!finalSalt) {
          throw new Error("Unable to retrieve decryption key. Use the magic link or ensure you have the correct URL.");
        }
        const decryptedJson = await decryptData(data.encrypted, targetCode, finalSalt);
        const content: ClipboardContent = JSON.parse(decryptedJson);

        setRetrievedData({
          content,
          expiresAt: data.expiresAt,
          maxViews: data.maxViews,
          viewCount: data.viewCount,
        });
        setShowResult(true);
        setCode([]);

        // Auto-copy text to clipboard or download file
        if (content.type === "text" && content.content) {
          try {
            await navigator.clipboard.writeText(content.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch {
            // Clipboard permission denied, will show manual copy button
          }
        } else if ((content.type === "file" || content.type === "image") && content.content && content.filename) {
          // Auto-download file
          try {
            // Handle both data URLs (images) and raw base64 (files)
            let base64Data = content.content;
            if (base64Data.includes(',')) {
              base64Data = base64Data.split(',')[1];
            }
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: content.mimeType || "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = content.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch {
            // Download failed, will show manual download button
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [code]
  );

  const handleDelete = useCallback(async () => {
    if (!retrievedData) return;

    try {
      const targetCode = code.join("") || "from_url";
      // Extract code from the URL if needed
      const urlCode = typeof window !== "undefined"
        ? window.location.pathname.split("/").pop()
        : null;
      const deleteCode = urlCode && /^\d{6}$/.test(urlCode) ? urlCode : targetCode;

      const response = await fetch(`/api/clipboard/${deleteCode}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShowResult(false);
        setRetrievedData(null);
        setCode([]);
        // Clear URL fragment
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }, [code, retrievedData]);

  const copyToClipboard = useCallback(() => {
    if (retrievedData?.content.content) {
      navigator.clipboard.writeText(retrievedData.content.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [retrievedData]);

  const downloadFile = useCallback(() => {
    if (!retrievedData?.content) return;

    const { content, filename, mimeType } = retrievedData.content;
    // Handle both data URLs (images) and raw base64 (files)
    let base64Data = content;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [retrievedData]);

  const formatExpiry = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (hours > 0) return `${hours}h ${minutes % 60}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div className="mx-auto max-w-md">
      <motion.div
        className="mb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-2 text-2xl font-bold">Retrieve Clipboard</h2>
        <p className="text-muted-foreground">
          Enter the 6-digit code or use a magic link
        </p>
      </motion.div>

      {/* Code Display */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all duration-200 ${
                i < code.length
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 bg-card/50 text-muted-foreground"
              }`}
            >
              {code[i] || ""}
            </div>
          ))}
        </div>
      </motion.div>

      {/* URL/Code Paste Input */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={urlInputRef}
            type="text"
            placeholder="Paste URL, magic link, or 6-digit code"
            value={urlInput}
            onChange={handleUrlPaste}
            className="pl-10 pr-4"
          />
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertTriangle className="h-4 w-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <Button
            key={i + 1}
            variant="outline"
            size="lg"
            className="h-16 text-xl font-semibold"
            onClick={() => handleKeyPress((i + 1).toString())}
            disabled={isLoading}
          >
            {i + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-xl font-semibold"
          onClick={handleClear}
          disabled={isLoading}
        >
          C
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-xl font-semibold"
          onClick={() => handleKeyPress("0")}
          disabled={isLoading}
        >
          0
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-16"
          onClick={handleBackspace}
          disabled={isLoading || code.length === 0}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* Retrieve Button */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Button
          onClick={() => handleRetrieve()}
          disabled={code.length !== 6 || isLoading}
          size="lg"
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Decrypting...
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              Retrieve & Decrypt
            </>
          )}
        </Button>
      </motion.div>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-500" />
              Clipboard Retrieved
            </DialogTitle>
            <DialogDescription>
              {retrievedData && formatExpiry(retrievedData.expiresAt)}
              {retrievedData?.maxViews === 1 && (
                <span className="ml-2 text-yellow-500">
                  • This was a single-view clipboard
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {retrievedData && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Auto-action notification */}
              {copied && retrievedData.content.type === "text" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2 text-sm text-green-600"
                >
                  <Check className="h-4 w-4" />
                  <span>Text has been copied to your clipboard!</span>
                </motion.div>
              )}
              
              {(retrievedData.content.type === "file" || retrievedData.content.type === "image") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-600"
                >
                  <Download className="h-4 w-4" />
                  <span>File has been automatically downloaded!</span>
                </motion.div>
              )}

              {/* Content Display */}
              <div className="rounded-xl bg-muted p-4">
                {retrievedData.content.type === "text" && (
                  <div className="space-y-2">
                    <textarea
                      readOnly
                      value={retrievedData.content.content}
                      className="min-h-[120px] w-full resize-none rounded-lg bg-transparent text-sm focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Text
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {retrievedData.content.type === "image" && (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={retrievedData.content.content}
                      alt={retrievedData.content.filename || "Retrieved image"}
                      className="max-h-[200px] rounded-lg object-contain"
                    />
                    <p className="text-sm text-muted-foreground">
                      <ImageIcon className="inline h-4 w-4" />{" "}
                      {retrievedData.content.filename}
                    </p>
                  </div>
                )}

                {retrievedData.content.type === "file" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                      <File className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">
                        {retrievedData.content.filename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {retrievedData.content.mimeType}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadFile}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResult(false)}
                  className="ml-auto"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
