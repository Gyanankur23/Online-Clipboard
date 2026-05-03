// Developer Toolbox utility functions

export type ToolType = "json" | "base64" | "markdown" | "none";

export interface ToolResult {
  type: ToolType;
  output: string;
  error?: string;
}

/**
 * Format JSON string with proper indentation
 */
export function formatJSON(input: string): ToolResult {
  try {
    const parsed = JSON.parse(input);
    return {
      type: "json",
      output: JSON.stringify(parsed, null, 2),
    };
  } catch (error) {
    return {
      type: "json",
      output: input,
      error: "Invalid JSON: " + (error as Error).message,
    };
  }
}

/**
 * Minify JSON - remove whitespace
 */
export function minifyJSON(input: string): ToolResult {
  try {
    const parsed = JSON.parse(input);
    return {
      type: "json",
      output: JSON.stringify(parsed),
    };
  } catch (error) {
    return {
      type: "json",
      output: input,
      error: "Invalid JSON: " + (error as Error).message,
    };
  }
}

/**
 * Toggle Base64 encoding/decoding
 * Auto-detects if input is base64 encoded
 */
export function toggleBase64(input: string): ToolResult {
  // Check if input looks like base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  const isBase64 =
    base64Regex.test(input) && input.length % 4 === 0 && input.length > 0;

  if (isBase64) {
    // Try to decode
    try {
      const decoded = atob(input);
      return {
        type: "base64",
        output: decoded,
      };
    } catch {
      // Not valid base64, encode instead
      return {
        type: "base64",
        output: btoa(input),
      };
    }
  } else {
    // Encode to base64
    try {
      return {
        type: "base64",
        output: btoa(input),
      };
    } catch (error) {
      return {
        type: "base64",
        output: input,
        error: "Cannot encode to Base64: " + (error as Error).message,
      };
    }
  }
}

/**
 * Encode string to Base64
 */
export function encodeBase64(input: string): ToolResult {
  try {
    return {
      type: "base64",
      output: btoa(input),
    };
  } catch (error) {
    return {
      type: "base64",
      output: input,
      error: "Cannot encode to Base64: " + (error as Error).message,
    };
  }
}

/**
 * Decode Base64 string
 */
export function decodeBase64(input: string): ToolResult {
  try {
    return {
      type: "base64",
      output: atob(input),
    };
  } catch (error) {
    return {
      type: "base64",
      output: input,
      error: "Invalid Base64: " + (error as Error).message,
    };
  }
}

/**
 * Render Markdown preview (returns HTML string)
 * This is a simple markdown parser for preview purposes
 */
export function renderMarkdown(input: string): ToolResult {
  try {
    // Simple markdown to HTML conversion
    let html = input
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      // Code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Code blocks
      .replace(/```([^`]+)```/g, "<pre><code>$1</code></pre>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Lists
      .replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      // Blockquotes
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Line breaks
      .replace(/\n/g, "<br>");

    return {
      type: "markdown",
      output: html,
    };
  } catch (error) {
    return {
      type: "markdown",
      output: input,
      error: "Markdown rendering error: " + (error as Error).message,
    };
  }
}

/**
 * Apply a toolbox transformation based on tool type
 */
export function applyTool(input: string, tool: ToolType, action?: string): ToolResult {
  switch (tool) {
    case "json":
      if (action === "minify") {
        return minifyJSON(input);
      }
      return formatJSON(input);
    case "base64":
      if (action === "encode") {
        return encodeBase64(input);
      }
      if (action === "decode") {
        return decodeBase64(input);
      }
      return toggleBase64(input);
    case "markdown":
      return renderMarkdown(input);
    default:
      return { type: "none", output: input };
  }
}
