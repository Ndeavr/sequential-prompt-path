/**
 * UNPRO — Public Layout (conversion-first)
 * Used by the 10 whitelisted public screens.
 */
import type { ReactNode } from "react";
import PublicHeaderMinimal from "@/components/navigation/PublicHeaderMinimal";
import PublicFooterMinimal from "@/components/navigation/PublicFooterMinimal";

interface PublicLayoutProps {
  children: ReactNode;
  /** Hide footer on full-screen experiences like /alex-match */
  hideFooter?: boolean;
  /** Hide header on full-screen experiences */
  hideHeader?: boolean;
}

export default function PublicLayout({
  children,
  hideFooter = false,
  hideHeader = false,
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Cinematic background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 15% 20%, hsl(222 100% 65% / 0.08), transparent 50%),
              radial-gradient(ellipse 70% 50% at 85% 80%, hsl(195 100% 55% / 0.06), transparent 50%),
              #060B14
            `,
          }}
        />
      </div>

      {!hideHeader && <PublicHeaderMinimal />}
      <main className="flex-1 flex flex-col relative z-0">{children}</main>
      {!hideFooter && <PublicFooterMinimal />}
    </div>
  );
}
