/**
 * UNPRO — Route Transition Loader
 * Premium loading screen shown during route resolution.
 */
import { motion } from "framer-motion";

export default function RouteTransitionLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Breathing orb */}
        <motion.div
          className="h-12 w-12 rounded-full bg-primary/20"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            boxShadow: "0 0 30px hsl(var(--primary) / 0.3)",
          }}
        />
        <p className="text-sm text-muted-foreground animate-pulse">
          Préparation de votre espace UNPRO…
        </p>
      </motion.div>
    </div>
  );
}
