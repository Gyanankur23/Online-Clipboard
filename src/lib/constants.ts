// Shared constants that can be imported by both client and server

export type ExpiryMode = "1min" | "10min" | "1hour" | "24hours" | "1view";

export const EXPIRY_OPTIONS: { value: ExpiryMode; label: string; seconds: number }[] = [
  { value: "1min", label: "1 Minute (Test)", seconds: 60 },
  { value: "10min", label: "10 Minutes", seconds: 600 },
  { value: "1hour", label: "1 Hour", seconds: 3600 },
  { value: "24hours", label: "24 Hours", seconds: 86400 },
  { value: "1view", label: "1 View Only", seconds: 86400 }, // Max 24h for single view
];
