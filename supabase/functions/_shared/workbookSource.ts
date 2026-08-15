/**
 * workbookSource — XLSX/XLS reader for official CKAN resources.
 * Isolated so the pure CKAN adapter stays dependency-free and testable.
 */
import { sheetRowsToRecords } from "./ckanSource.ts";

export async function parseWorkbook(bytes: ArrayBuffer): Promise<Record<string, string>[]> {
  const XLSX = await import("https://esm.sh/xlsx@0.18.5");
  const wb = XLSX.read(new Uint8Array(bytes), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: "" }) as unknown[][];
  return sheetRowsToRecords(aoa);
}
