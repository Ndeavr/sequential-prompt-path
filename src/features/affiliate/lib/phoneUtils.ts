export function digitsOnly(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}
export function formatPhoneStorage(raw: string): string | null {
  const d = digitsOnly(raw);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}
export function formatPhoneDisplay(raw: string): string {
  const d = digitsOnly(raw).replace(/^1/, "").slice(0, 10);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
