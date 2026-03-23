/**
 * UNPRO — Auth Card wrapper with premium glass styling
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import logo from "@/assets/unpro-robot.png";

interface AuthCardUnproProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthCardUnpro({ title, subtitle, children }: AuthCardUnproProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 40% 96%) 58%, hsl(220 50% 92%) 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(var(--primary) / 0.08)" }} />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(var(--secondary) / 0.06)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-card/92 border-border shadow-[var(--shadow-xl)] backdrop-blur-lg">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center mb-3">
              <img src={logo} alt="UNPRO" className="h-14 w-14 object-contain" />
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
