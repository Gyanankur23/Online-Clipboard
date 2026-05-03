"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RetrieveRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  useEffect(() => {
    // The fragment (#...) is preserved by the browser and available in window.location.hash
    // Redirect to main page with auto-retrieve triggered by the fragment
    if (code && /^\d{6}$/.test(code)) {
      // The hash will be automatically handled by the RetrieveView component
      router.push(`/?retrieve=${code}`);
    }
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
        <h1 className="mb-2 text-xl font-semibold">Retrieving Clipboard...</h1>
        <p className="text-muted-foreground">
          Decrypting content securely on your device
        </p>
        <Button
          variant="ghost"
          className="mt-4 gap-2"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Go Home
        </Button>
      </motion.div>
    </div>
  );
}
