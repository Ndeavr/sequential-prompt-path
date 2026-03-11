import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const FlywheelCTA = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className="text-center"
  >
    <h2 className="font-display text-title md:text-hero-sm text-foreground mb-3">
      Un réseau qui devient plus intelligent avec chaque maison et chaque projet
    </h2>
    <p className="text-body-lg text-muted-foreground max-w-xl mx-auto mb-8">
      Rejoignez le flywheel UNPRO et participez à la construction du réseau le plus intelligent en habitation.
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Button asChild size="lg" variant="default">
        <Link to="/dashboard/home-score">
          Voir le House Score
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link to="/professionals">Rejoindre comme entrepreneur</Link>
      </Button>
    </div>
  </motion.div>
);
