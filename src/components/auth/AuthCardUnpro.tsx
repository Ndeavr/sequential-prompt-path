/**
 * UNPRO — Auth Card wrapper: opaque midnight-blue card with local tokens,
 * independent of the global light/dark theme and Card pseudo-elements.
 */
import type { CSSProperties } from "react";
import UnproIcon from "@/components/brand/UnproIcon";

interface AuthCardUnproProps {
  title: string;
  subtitle?: string;
  note?: string;
  children: React.ReactNode;
}

// Local tokens so every child (shadcn Button, inputs, muted text) stays readable.
const scopeTokens = {
  "--background": "222 62% 9%",
  "--foreground": "0 0% 100%",
  "--card": "220 55% 13%",
  "--card-foreground": "0 0% 100%",
  "--muted": "220 40% 20%",
  "--muted-foreground": "220 30% 80%",
  "--border": "220 35% 30%",
  "--input": "220 35% 34%",
  "--ring": "216 90% 60%",
  "--primary": "216 90% 51%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "220 40% 22%",
  "--secondary-foreground": "0 0% 100%",
  "--accent": "220 40% 24%",
  "--accent-foreground": "0 0% 100%",
  "--destructive": "0 80% 64%",
  colorScheme: "dark",
  background:
    "radial-gradient(60% 40% at 50% 0%, hsl(216 90% 51% / 0.22), transparent 70%), linear-gradient(180deg, #071329 0%, #0b1a38 100%)",
  color: "#fff",
} as CSSProperties;

export default function AuthCardUnpro({ title, subtitle, note, children }: AuthCardUnproProps) {
  return (
    <div
      className="unpro-auth-scope flex min-h-[100svh] w-full items-start justify-center px-4 pb-10 pt-6 sm:items-center sm:pt-10"
      style={scopeTokens}
    >
      <div
        className="w-full max-w-[440px] rounded-[24px] px-5 py-7 sm:px-6"
        style={{
          background: "#0f1f3f",
          border: "1px solid hsl(216 60% 40% / 0.45)",
          boxShadow: "0 24px 60px -24px #000c, 0 0 48px -12px hsl(216 90% 51% / 0.35)",
        }}
      >
        <div className="mb-5 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#e8eef8" }}>
              <UnproIcon size={38} variant="primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
          {note && <p className="mt-0.5 text-[15px] font-medium text-foreground">{note}</p>}
        </div>
        <div className="space-y-1">{children}</div>
      </div>
      <style>{`.unpro-auth-scope button:focus-visible,.unpro-auth-scope input:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}`}</style>
    </div>
  );
}
