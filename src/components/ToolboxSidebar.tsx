"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  Code2,
  Binary,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyTool,
  ToolType,
  formatJSON,
  minifyJSON,
  encodeBase64,
  decodeBase64,
} from "@/lib/toolbox";

interface ToolboxSidebarProps {
  content: string;
  onApply?: (transformed: string) => void;
}

interface ToolButton {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TOOLS: ToolButton[] = [
  {
    id: "json",
    label: "JSON",
    icon: <Code2 className="h-4 w-4" />,
    description: "Format or minify JSON",
  },
  {
    id: "base64",
    label: "Base64",
    icon: <Binary className="h-4 w-4" />,
    description: "Encode/Decode Base64",
  },
  {
    id: "markdown",
    label: "Markdown",
    icon: <FileCode className="h-4 w-4" />,
    description: "Preview Markdown",
  },
];

export function ToolboxSidebar({ content, onApply }: ToolboxSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleToolClick = useCallback(
    (toolId: ToolType) => {
      if (!content) return;

      setActiveTool(toolId);

      if (toolId === "markdown") {
        const toolResult = applyTool(content, toolId);
        setResult(toolResult.output);
      } else {
        // For other tools, just apply them
        const toolResult = applyTool(content, toolId);
        setResult(toolResult.output);
      }
    },
    [content]
  );

  const handleFormatJSON = useCallback(() => {
    const toolResult = formatJSON(content);
    setResult(toolResult.output);
    onApply?.(toolResult.output);
  }, [content, onApply]);

  const handleMinifyJSON = useCallback(() => {
    const toolResult = minifyJSON(content);
    setResult(toolResult.output);
    onApply?.(toolResult.output);
  }, [content, onApply]);

  const handleEncodeBase64 = useCallback(() => {
    const toolResult = encodeBase64(content);
    setResult(toolResult.output);
    onApply?.(toolResult.output);
  }, [content, onApply]);

  const handleDecodeBase64 = useCallback(() => {
    const toolResult = decodeBase64(content);
    setResult(toolResult.output);
    onApply?.(toolResult.output);
  }, [content, onApply]);

  const copyResult = useCallback(() => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setActiveTool(null);
    setResult("");
  }, []);

  // Don't render if there's no content
  if (!content) {
    return (
      <motion.div
        className="fixed right-4 top-1/2 z-40 -translate-y-1/2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:bg-card"
          onClick={() => setIsOpen(true)}
          disabled
          title="Add content to use tools"
        >
          <Wrench className="h-5 w-5 text-muted-foreground" />
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.div
        className="fixed right-4 top-1/2 z-40 -translate-y-1/2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Button
          variant="outline"
          size="icon"
          className={`h-12 w-12 rounded-full border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300 ${
            isOpen
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-card/80 hover:bg-card"
          }`}
          onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
        >
          {isOpen ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <Wrench className="h-5 w-5" />
          )}
        </Button>
      </motion.div>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed right-0 top-0 z-30 h-full w-80 border-l border-border/50 bg-card/95 p-6 shadow-2xl backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <div className="mb-6 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Developer Toolbox</h2>
            </div>

            {/* Tool Selection */}
            <div className="mb-6 space-y-2">
              <p className="text-sm text-muted-foreground">Select a tool:</p>
              <div className="grid grid-cols-1 gap-2">
                {TOOLS.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={activeTool === tool.id ? "default" : "outline"}
                    className="justify-start gap-3"
                    onClick={() => handleToolClick(tool.id)}
                  >
                    {tool.icon}
                    <div className="text-left">
                      <div className="font-medium">{tool.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {tool.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Tool Actions */}
            <AnimatePresence mode="wait">
              {activeTool === "json" && (
                <motion.div
                  key="json-tools"
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-sm font-medium">JSON Actions:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleFormatJSON}
                    >
                      <Code2 className="mr-2 h-4 w-4" />
                      Format
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleMinifyJSON}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Minify
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTool === "base64" && (
                <motion.div
                  key="base64-tools"
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-sm font-medium">Base64 Actions:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleEncodeBase64}
                    >
                      <Binary className="mr-2 h-4 w-4" />
                      Encode
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleDecodeBase64}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Decode
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTool === "markdown" && (
                <motion.div
                  key="markdown-preview"
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Preview:</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={copyResult}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className="max-h-[300px] overflow-auto rounded-lg bg-muted p-4 text-sm prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: result || "<p class='text-muted-foreground'>No content to preview</p>",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Display for non-markdown tools */}
            {activeTool && activeTool !== "markdown" && result && (
              <motion.div
                className="mt-4 space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Result:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={copyResult}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="max-h-[200px] overflow-auto rounded-lg bg-muted p-3">
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {result}
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Original Content Preview */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Original Content:
              </p>
              <div className="max-h-[100px] overflow-auto rounded-lg border border-border/50 bg-card p-3">
                <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                  {content.length > 500
                    ? content.substring(0, 500) + "..."
                    : content}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
