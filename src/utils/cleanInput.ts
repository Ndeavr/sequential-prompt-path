/**
 * Global text input cleaning utility.
 * 
 * Handles mobile paste junk, invisible unicode, extra spaces.
 */

/**
 * Deep clean any text input:
 * - Remove zero-width chars, BOM, invisible separators
 * - Replace tabs/newlines with spaces
 * - Collapse multiple spaces to one
 * - Trim leading/trailing whitespace
 */
export function cleanInput(raw: string): string {
  return raw
    // Remove zero-width and invisible unicode chars
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u034F\u061C\u180E]/g, "")
    // Replace tabs, newlines, carriage returns with space
    .replace(/[\t\n\r]/g, " ")
    // Collapse multiple spaces to one
    .replace(/ {2,}/g, " ")
    // Trim
    .trim();
}

/**
 * Clean a text field value — for names, company names, cities, etc.
 * Same as cleanInput but also normalizes smart punctuation.
 */
export function cleanTextField(raw: string): string {
  return cleanInput(raw)
    // Normalize smart quotes to regular
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Normalize em/en dashes to hyphen
    .replace(/[\u2013\u2014]/g, "-");
}
