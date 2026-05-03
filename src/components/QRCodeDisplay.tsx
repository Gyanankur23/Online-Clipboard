"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically import qrcode to avoid SSR issues
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(url, {
        width: size,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((dataUrl: string) => {
          setQrDataUrl(dataUrl);
        })
        .catch((err: Error) => {
          console.error("QR Code generation error:", err);
        });
    });
  }, [url, size]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `clipboard-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!qrDataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-muted"
        style={{ width: size, height: size }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative overflow-hidden rounded-xl border-4 border-white bg-white shadow-lg">
        <img
          src={qrDataUrl}
          alt="QR Code for clipboard link"
          width={size}
          height={size}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
          <div className="rounded-full bg-black/50 p-2 backdrop-blur-sm">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={downloadQR}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Download QR
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Scan with your phone to open instantly
      </p>
    </motion.div>
  );
}
