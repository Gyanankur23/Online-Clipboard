"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendView } from "@/components/SendView";
import { RetrieveView } from "@/components/RetrieveView";
import { ToolboxSidebar } from "@/components/ToolboxSidebar";
import { ClipboardContent } from "@/components/UniversalInput";
import { Clipboard, Shield, Zap, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function Home() {
  const [currentContent, setCurrentContent] = useState<string>("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle content change from UniversalInput
  const handleContentChange = (content: ClipboardContent | null) => {
    if (content?.type === "text") {
      setCurrentContent(content.content);
    } else {
      setCurrentContent("");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-secondary/20 blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border/50 bg-card/50 px-6 py-4 backdrop-blur-xl dark:glass-panel dark:border-white/5">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg dark:from-indigo-500 dark:to-purple-600 dark:shadow-indigo-500/20">
            <Clipboard className="h-5 w-5 text-primary-foreground dark:text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-white/95">Online Clipboard</h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-green-500" />
              <span className="dark:text-white/60">Zero-Knowledge Encrypted</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full dark:hover:bg-white/10"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-white/80 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Share Anything.{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Securely.
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Zero-knowledge encrypted clipboard. Your data is encrypted in your browser
            before it ever reaches our servers. Even we can&apos;t read it.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {[
            {
              icon: <Shield className="h-5 w-5" />,
              title: "AES-GCM Encryption",
              desc: "Client-side encryption",
            },
            {
              icon: <Zap className="h-5 w-5" />,
              title: "Ephemeral",
              desc: "Auto-expires after set time",
            },
            {
              icon: <Clipboard className="h-5 w-5" />,
              title: "Any Content",
              desc: "Text, images, files up to 10MB",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="sleek-card flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-colors hover:bg-card/80 dark:glass-panel"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-gradient-to-br dark:from-indigo-500/20 dark:to-purple-500/20">
                {feature.icon}
              </div>
              <div>
                <p className="font-medium dark:text-white/90">{feature.title}</p>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Tabs defaultValue="send" className="w-full">
            <TabsList className="mx-auto mb-8 grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="send" className="gap-2">
                <Zap className="h-4 w-4" />
                Send
              </TabsTrigger>
              <TabsTrigger value="retrieve" className="gap-2">
                <Clipboard className="h-4 w-4" />
                Retrieve
              </TabsTrigger>
            </TabsList>

            <TabsContent value="send" className="mt-0">
              <SendView />
            </TabsContent>

            <TabsContent value="retrieve" className="mt-0">
              <RetrieveView />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Developer Toolbox Sidebar */}
      <ToolboxSidebar content={currentContent} />

      {/* Footer */}
      <footer className="relative z-10 mt-16 border-t border-border/50 bg-card/30 py-6 text-center backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          🔒 Zero-knowledge architecture • AES-256-GCM encryption • No data retention
        </p>
      </footer>
    </div>
  );
}
