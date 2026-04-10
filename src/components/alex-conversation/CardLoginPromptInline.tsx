import { motion } from "framer-motion";
import { LogIn, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CardLoginPromptInline() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-3.5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Créez votre compte gratuit</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Pour réserver et sauvegarder votre recherche, connectez-vous en 30 secondes.
      </p>
      <button
        onClick={() => navigate("/login")}
        className="w-full text-xs font-semibold py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
      >
        <LogIn className="w-3.5 h-3.5" /> Se connecter
      </button>
    </motion.div>
  );
}
