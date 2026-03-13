import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden isolate select-none transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:shadow-glow hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline: "border border-border/60 bg-card/50 hover:bg-muted/50 hover:border-primary/25 shadow-soft",
        secondary: "bg-muted text-foreground hover:bg-muted/80 shadow-soft",
        ghost: "hover:bg-muted/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        soft: "bg-primary/8 text-primary hover:bg-primary/14 border border-primary/10",
        premium: "bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground shadow-glow hover:shadow-glow-lg hover:brightness-105",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-11 rounded-xl px-7 text-sm",
        xl: "h-12 rounded-xl px-8 text-sm font-bold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const innerRef = React.useRef<HTMLButtonElement | null>(null);

    // Skip ripple for ghost/link variants
    const skipEffects = variant === "ghost" || variant === "link";

    const handlePointerDown = React.useCallback(
      (e: React.PointerEvent<HTMLButtonElement>) => {
        if (skipEffects) return;
        const btn = innerRef.current;
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Create ripple
        const ripple = document.createElement("span");
        const diameter = Math.max(rect.width, rect.height) * 2;
        Object.assign(ripple.style, {
          position: "absolute",
          width: `${diameter}px`,
          height: `${diameter}px`,
          left: `${x - diameter / 2}px`,
          top: `${y - diameter / 2}px`,
          borderRadius: "50%",
          background: "hsl(0 0% 100% / 0.28)",
          pointerEvents: "none",
          zIndex: "1",
          animation: "btn-ripple 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        });

        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      },
      [skipEffects],
    );

    const handlePointerUp = React.useCallback(
      (e: React.PointerEvent<HTMLButtonElement>) => {
        if (skipEffects) return;
        const btn = innerRef.current;
        if (!btn) return;

        // Create sweep highlight on release
        const sweep = document.createElement("span");
        Object.assign(sweep.style, {
          position: "absolute",
          inset: "0",
          width: "50%",
          pointerEvents: "none",
          zIndex: "2",
          background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.22), transparent)",
          animation: "btn-sweep 0.48s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        });

        btn.appendChild(sweep);
        setTimeout(() => sweep.remove(), 500);
      },
      [skipEffects],
    );

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      },
      [ref],
    );

    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={mergedRef} onClick={onClick} {...props} />;
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={mergedRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={onClick}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
