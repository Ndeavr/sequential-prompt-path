/**
 * alexTextFormatter — Robust formatting utilities for Alex voice transcripts.
 * Fixes spacing, punctuation, and streaming chunk artifacts.
 */

/**
 * Normalize French spacing rules:
 * - Space before : ; ? !
 * - No double spaces
 * - Proper apostrophe handling
 */
export function normalizeFrenchSpacing(text: string): string {
  if (!text) return "";

  let result = text;

  // Fix missing spaces after punctuation (e.g., "mot.Mot" → "mot. Mot")
  result = result.replace(/([.!?;:,])([A-ZÀ-ÖÙ-Üa-zà-öù-ü])/g, "$1 $2");

  // Fix missing spaces between lowercase-uppercase transitions (e.g., "motMot" → "mot Mot")
  result = result.replace(/([a-zà-öù-ü])([A-ZÀ-ÖÙ-Ü])/g, "$1 $2");

  // French typography: space before ; : ? !
  result = result.replace(/\s*([;:?!])/g, " $1");

  // No space after opening quotes/parens
  result = result.replace(/([«(])\s+/g, "$1");

  // No space before closing quotes/parens
  result = result.replace(/\s+([»)])/g, "$1");

  // Fix multiple spaces
  result = result.replace(/\s{2,}/g, " ");

  // Fix leading/trailing spaces
  result = result.trim();

  return result;
}

/**
 * Clean up artifacts from streaming text chunks:
 * - Remove partial word fragments at boundaries
 * - Fix run-together words from chunk concatenation
 */
export function cleanupStreamingChunks(text: string): string {
  if (!text) return "";

  let result = text;

  // Common streaming artifacts: words glued together
  // Pattern: lowercase letter immediately followed by uppercase = missing space
  result = result.replace(/([a-zà-öù-üé])([A-ZÀ-ÖÙ-Ü])/g, "$1 $2");

  // Fix "d'" "l'" "n'" "s'" "j'" "qu'" with missing space before
  result = result.replace(/([a-zà-öù-ü])([dDlLnNsS]')[aAàeEéèêiIoOuUyYhH]/g, (match, before, article) => {
    return `${before} ${match.slice(before.length)}`;
  });

  return result;
}

/**
 * Format Alex transcript for display in the UI.
 * Applies all normalizations in the correct order.
 */
export function formatAlexTranscriptForDisplay(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // Step 1: Clean streaming artifacts
  text = cleanupStreamingChunks(text);

  // Step 2: Normalize French spacing
  text = normalizeFrenchSpacing(text);

  return text;
}

/**
 * Smart concatenation for streaming chunks.
 * Ensures proper spacing when appending new text to existing text.
 */
export function smartConcatChunk(existing: string, newChunk: string): string {
  if (!existing) return newChunk;
  if (!newChunk) return existing;

  const trimmedExisting = existing.trimEnd();
  const trimmedNew = newChunk.trimStart();

  // If existing ends with a letter/number and new starts with a letter/number, add space
  const lastChar = trimmedExisting[trimmedExisting.length - 1];
  const firstChar = trimmedNew[0];

  if (!lastChar || !firstChar) return trimmedExisting + trimmedNew;

  const lastIsAlphaNum = /[a-zA-ZÀ-ÖÙ-Üà-öù-ü0-9]/.test(lastChar);
  const firstIsAlphaNum = /[a-zA-ZÀ-ÖÙ-Üà-öù-ü0-9]/.test(firstChar);

  // Don't add space if new chunk starts with punctuation
  const firstIsPunct = /[.,;:!?''"»)\]}]/.test(firstChar);

  // Don't add space if existing ends with opening punct
  const lastIsOpenPunct = /[«(\[{]/.test(lastChar);

  // Add space between two alphanumeric characters
  if (lastIsAlphaNum && firstIsAlphaNum && !firstIsPunct && !lastIsOpenPunct) {
    return trimmedExisting + " " + trimmedNew;
  }

  // Add space after punctuation before alphanumeric
  if (/[.!?;:,]/.test(lastChar) && firstIsAlphaNum) {
    return trimmedExisting + " " + trimmedNew;
  }

  return trimmedExisting + trimmedNew;
}
