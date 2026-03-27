import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PageRecruitmentThankYou() {
  return (
    <>
      <Helmet>
        <title>Merci — Candidature reçue | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-20 w-20 text-primary mx-auto" />
          </motion.div>

          <h1 className="text-3xl font-display font-bold text-foreground">
            Candidature reçue!
          </h1>

          <p className="text-muted-foreground text-lg">
            Merci pour ton intérêt. On te contacte sous 48 heures pour planifier ta première rencontre.
          </p>

          <div className="space-y-2 text-left bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-semibold text-foreground text-sm">Prochaines étapes:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                Appel découverte de 15 min
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                Formation express sur le produit
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                Tes premiers rendez-vous dans ton agenda
              </li>
            </ul>
          </div>

          <Button asChild variant="outline">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </motion.div>
      </div>
    </>
  );
}
