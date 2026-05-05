"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Clock,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UniversalInput, ClipboardContent } from "./UniversalInput";
import { QRCodeDisplay } from "./QRCodeDisplay";
import { encryptData } from "@/lib/crypto";
import { EXPIRY_OPTIONS, ExpiryMode } from "@/lib/constants";

interface SendResult {
  code: string;
  magicLink: string;
}

export function SendView() {
  const [content, setContent] = useState<ClipboardContent | null>(null);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("10min");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!content || isSending) return;

    setIsSending(true);
    try {
      // Generate code and encrypt locally
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Encrypt the content
      const { encrypted, salt } = await encryptData(
        JSON.stringify(content),
        code
      );

      // Send to server (encrypted blob only)
      const response = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          encrypted,
          salt,
          type: content.type,
          filename: content.filename,
          mimeType: content.mimeType,
          expiryMode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send clipboard");
      }

      const data = await response.json();
      setResult({
        code: data.code,
        magicLink: data.magicLink,
      });
      setShowSuccess(true);
      setContent(null);
    } catch (error) {
      console.error("Send error:", error);
      alert("Failed to send clipboard. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [content, expiryMode, isSending]);

  const copyToClipboard = useCallback((text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleClose = useCallback(() => {
    setShowSuccess(false);
    setResult(null);
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        className="mb-6 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-2 text-2xl font-bold">Send to Clipboard</h2>
        <p className="text-muted-foreground">
          Your data is encrypted before leaving your device.
          <br />
          <span className="inline-flex items-center gap-1 text-sm">
            <Shield className="h-3 w-3 text-green-500" />
            Zero-knowledge encryption with AES-GCM
          </span>
        </p>
      </motion.div>

      <UniversalInput value={content} onChange={setContent} />

      <motion.div
        className="mt-6 flex items-center justify-between gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Expires in:</span>
          <Select
            value={expiryMode}
            onValueChange={(v) => setExpiryMode(v as ExpiryMode)}
          >
            <SelectTrigger className="w-[180px] bg-card/50 backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSend}
          disabled={!content || isSending}
          size="lg"
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 px-8"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Encrypting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Securely
            </>
          )}
        </Button>
      </motion.div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center text-xl">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Clipboard Created!
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {/* 6-Digit Code */}
                <div className="rounded-xl bg-primary/10 p-4 text-center">
                  <p className="mb-1 text-sm text-muted-foreground">
                    6-Digit Code
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-bold tracking-wider text-primary">
                      {result.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(result.code, "code")}
                    >
                      {copied === "code" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Magic Link */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Magic Link</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                    <code className="flex-1 truncate text-xs">
                      {result.magicLink}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        copyToClipboard(result.magicLink, "link")
                      }
                    >
                      {copied === "link" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => window.open(result.magicLink, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The decryption key is in the URL fragment (after #) -
                    never sent to the server
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <QRCodeDisplay url={result.magicLink} size={180} />
                </div>

                <Button onClick={handleClose} className="w-full">
                  Create Another
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
