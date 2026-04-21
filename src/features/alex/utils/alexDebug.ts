/**
 * Alex 100M — Debug Helpers
 * Ring buffer for dev inspection. No-op in production builds.
 */

import type { AlexDebugEntry } from "../types/alex.types";

const MAX_ENTRIES = 200;
const buffer: AlexDebugEntry[] = [];
const isDev = import.meta.env.DEV;

export function alexLog(tag: string, payload?: unknown): void {
  const entry: AlexDebugEntry = { ts: Date.now(), tag, payload };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
  if (isDev) {
    console.log(`[Alex] ${tag}`, payload ?? "");
  }
}

export function getAlexDebugLog(): readonly AlexDebugEntry[] {
  return buffer;
}

export function clearAlexDebugLog(): void {
  buffer.length = 0;
}

export function dumpAlexDebugLog(): string {
  return JSON.stringify(buffer, null, 2);
}
