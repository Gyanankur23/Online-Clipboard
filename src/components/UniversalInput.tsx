"use client";

import React, { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  File,
  Copy,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ClipboardContent {
  type: "text" | "image" | "file";
  content: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

interface UniversalInputProps {
  value: ClipboardContent | null;
  onChange: (content: ClipboardContent | null) => void;
  onPaste?: (content: ClipboardContent) => void;
  disabled?: boolean;
}

export function UniversalInput({
  value,
  onChange,
  onPaste,
  disabled = false,
}: UniversalInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(
    async (file: File): Promise<ClipboardContent> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (file.type.startsWith("image/")) {
          reader.onload = (e) => {
            resolve({
              type: "image",
              content: e.target?.result as string,
              filename: file.name,
              mimeType: file.type,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        } else {
          // For non-image files, read as base64
          reader.onload = (e) => {
            const result = e.target?.result as string;
            // Remove data URL prefix if present
            const base64 = result.split(",")[1] || result;
            resolve({
              type: "file",
              content: base64,
              filename: file.name,
              mimeType: file.type,
              size: file.size,
            });
          };
          reader.readAsDataURL(file);
        }

        reader.onerror = () => reject(new Error("Failed to read file"));
      });
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert("File size must be less than 10MB");
          return;
        }
        try {
          const content = await processFile(file);
          onChange(content);
        } catch (error) {
          console.error("Error processing file:", error);
          alert("Failed to process file");
        }
      }
    },
    [disabled, onChange, processFile]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert("File size must be less than 10MB");
          return;
        }
        try {
          const content = await processFile(file);
          onChange(content);
        } catch (error) {
          console.error("Error processing file:", error);
          alert("Failed to process file");
        }
      }
    },
    [onChange, processFile]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const file = files[0];
        if (file.size > 10 * 1024 * 1024) {
          alert("File size must be less than 10MB");
          return;
        }
        try {
          const content = await processFile(file);
          onChange(content);
          onPaste?.(content);
        } catch (error) {
          console.error("Error processing pasted file:", error);
        }
      }
    },
    [disabled, onChange, onPaste, processFile]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      if (text) {
        onChange({
          type: "text",
          content: text,
        });
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  const clearContent = useCallback(() => {
    onChange(null);
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
  }, [onChange]);

  const copyToClipboard = useCallback(() => {
    if (value?.content) {
      navigator.clipboard.writeText(value.content);
    }
  }, [value]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      className="relative w-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-4 border-dashed border-primary bg-primary/10 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center">
              <Upload className="mx-auto mb-4 h-16 w-16 text-primary" />
              <p className="text-xl font-semibold text-primary">
                Drop files here
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl transition-all duration-300 hover:border-border/80">
        {!value ? (
          <div className="flex h-[300px] flex-col">
            <Textarea
              ref={textareaRef}
              placeholder="Type or paste text here, or drop files..."
              className="h-full resize-none border-0 bg-transparent text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={handleTextChange}
              onPaste={handlePaste}
              disabled={disabled}
            />
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Copy className="h-4 w-4" />
                <span>Supports paste from clipboard</span>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={disabled}
                />
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80">
                  <Upload className="h-4 w-4" />
                  <span>Upload File</span>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <motion.div
            className="relative p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute right-4 top-4 flex gap-2">
              {value.type === "text" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={clearContent}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {value.type === "text" && (
              <Textarea
                value={value.content}
                onChange={handleTextChange}
                className="min-h-[200px] resize-none border-0 bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={disabled}
              />
            )}

            {value.type === "image" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative max-h-[300px] overflow-hidden rounded-xl">
                  <img
                    src={value.content}
                    alt={value.filename || "Pasted image"}
                    className="max-h-[300px] w-auto object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>{value.filename}</span>
                  <span>•</span>
                  <span>{formatFileSize(value.size)}</span>
                </div>
              </div>
            )}

            {value.type === "file" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10">
                  <File className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{value.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {value.mimeType} • {formatFileSize(value.size)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
