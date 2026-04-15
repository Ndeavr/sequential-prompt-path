/**
 * LayoutAlexCinematicShell — Premium dark cinematic container for Alex conversation.
 * Provides ambient glow, depth, and premium feel.
 */
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function LayoutAlexCinematicShell({ children }: Props) {
  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      {/* Top ambient glow - blue/violet */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.06) 0%, hsl(262 80% 50% / 0.03) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Bottom subtle glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </div>
  );
}
