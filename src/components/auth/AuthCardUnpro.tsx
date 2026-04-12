/**
 * UNPRO — Auth Card wrapper with premium dark glass styling
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";

interface AuthCardUnproProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthCardUnpro({ title, subtitle, children }: AuthCardUnproProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden bg-background">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-[-120px] h-72 w-72 rounded-full blur-[100px]"
          style={{ background: "hsl(var(--primary) / 0.12)" }}
        />
        <div
          className="absolute top-48 right-[-80px] h-64 w-64 rounded-full blur-[100px]"
          style={{ background: "hsl(var(--secondary) / 0.08)" }}
        />
        <div
          className="absolute bottom-24 left-1/3 h-48 w-48 rounded-full blur-[90px]"
          style={{ background: "hsl(var(--accent) / 0.06)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card
          className="border-border/60 backdrop-blur-xl"
          style={{
            background: "hsl(228 30% 11% / 0.92)",
            boxShadow: "var(--shadow-2xl), 0 0 60px -10px hsl(222 100% 65% / 0.1)",
            border: "1px solid hsl(228 20% 20% / 0.6)",
          }}
        >
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center mb-3">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(222 100% 65% / 0.1)" }}
              >
                <UnproIcon size={44} variant="primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm mt-1 text-muted-foreground">{subtitle}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-1 pb-8">
            {children}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
