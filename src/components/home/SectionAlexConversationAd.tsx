/**
 * SectionAlexConversationBookingAdPreview
 * Showcases the Alex conversation flow as an immersive ad section
 */
import { motion } from "framer-motion";
import { fadeUp, viewportOnce, staggerContainer } from "@/lib/motion";
import CardConversationPreview from "./alex-conversation/CardConversationPreview";

export default function SectionAlexConversationAd() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background aura */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="container max-w-5xl">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="text-center mb-10 sm:mb-14"
        >
          <motion.p variants={fadeUp} className="text-meta font-medium text-primary mb-2 tracking-wide uppercase">
            Voyez Alex en action
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-title sm:text-hero-sm text-foreground">
            Photo. Diagnostic. Rendez-vous.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-body text-muted-foreground mt-3 max-w-lg mx-auto">
            Uploadez une photo, Alex identifie le problème, recommande le bon professionnel et vous propose un créneau — en quelques secondes.
          </motion.p>
        </motion.div>

        <CardConversationPreview />
      </div>
    </section>
  );
}
