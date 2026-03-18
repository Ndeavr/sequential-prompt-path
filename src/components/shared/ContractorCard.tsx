import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface ContractorCardProps {
  name: string;
  category: string;
  city: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  badges: string[];
  nextAvailability: string;
  pricingStyle: string;
  description: string;
  to?: string;
}

export default function ContractorCard({ name, category, city, specialties, rating, reviewCount, badges, nextAvailability, pricingStyle, description, to }: ContractorCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Card className="hover:shadow-lg transition-all duration-300 group overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary font-medium">{category}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{city}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm shrink-0">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <span className="font-semibold text-foreground">{rating}</span>
              <span className="text-muted-foreground">({reviewCount})</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>

          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{b}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {specialties.slice(0, 3).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>{nextAvailability}</div>
              <div className="font-medium text-foreground">{pricingStyle}</div>
            </div>
            <Link
              to={to || "/decrire-mon-projet"}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Voir profil <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
