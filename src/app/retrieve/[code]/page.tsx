"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RetrieveRedirectPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function processPayload() {
      try {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        
        // If there's no cryptographic fragment, redirect to home for manual code entry
        if (!hash || hash.length <= 1) {
          router.push("/");
          return;
        }

        // Clean up the hash symbol and extract the raw Base64 data string
        const base64Fragment = hash.substring(1);
        
        // Decode the secure data parameters on the client side
        const rawJson = decodeURIComponent(atob(base64Fragment));
        const parsed = JSON.parse(rawJson);

        const { storageId, salt } = parsed;

        if (!storageId || !salt) {
          setErrorMsg("Malformed or corrupted magic link parameter structural keys.");
          return;
        }

        // Forward to the dashboard to safely decrypt the payload inside your state context
        router.push(`/?storageId=${storageId}&salt=${salt}`);
      } catch (err) {
        console.error("Failed parsing extraction parameters:", err);
        setErrorMsg("Invalid magic link parameters. Check your clip encryption structural formatting.");
      }
    }

    processPayload();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        className="text-center max-w-sm px-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {errorMsg ? (
          <>
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="mb-2 text-xl font-semibold text-destructive">Decryption Error</h1>
            <p className="text-muted-foreground text-sm mb-4">{errorMsg}</p>
            <Button variant="outline" className="gap-2 w-full" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
              Return Home
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h1 className="mb-2 text-xl font-semibold">Retrieving Clipboard...</h1>
            <p className="text-muted-foreground text-sm">
              Extracting unique storage identifier keys safely inside your isolated browser cache...
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
