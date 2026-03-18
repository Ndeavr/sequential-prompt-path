import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CityCardProps {
  name: string;
  slug: string;
  region: string;
  professionalCount: number;
  serviceCategoryCount: number;
  featuredProblems: string[];
}

export default function CityCard({ name, slug, region, professionalCount, serviceCategoryCount, featuredProblems }: CityCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <Link to={`/services/${slug}`}>
        <Card className="hover:shadow-lg transition-all duration-300 group h-full">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{region}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" />{professionalCount} pros</span>
              <span className="text-muted-foreground">{serviceCategoryCount} services</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {featuredProblems.map((p) => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
