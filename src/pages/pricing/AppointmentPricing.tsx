import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const CLASSES = [
  { name: "S", example: "Petites réparations", price: "15 $", color: "bg-success/10 text-success border-success/20" },
  { name: "M", example: "Travaux standards", price: "50 $", color: "bg-primary/10 text-primary border-primary/20" },
  { name: "L", example: "Projets moyens", price: "120 $", color: "bg-accent/10 text-accent border-accent/20" },
  { name: "XL", example: "Rénovations majeures", price: "250 $", color: "bg-secondary/10 text-secondary border-secondary/20" },
  { name: "XXL", example: "Projets majeurs", price: "500 $", color: "bg-warning/10 text-warning border-warning/20" },
];

export default function AppointmentPricing() {
  return (
    <section className="px-5 py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Prix des rendez-vous garantis</h2>
          <p className="text-muted-foreground mt-2">Tarification selon la classe de projet</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-semibold text-foreground">Classe</th>
                  <th className="text-left p-4 font-semibold text-foreground">Exemple</th>
                  <th className="text-right p-4 font-semibold text-foreground">Prix</th>
                </tr>
              </thead>
              <tbody>
                {CLASSES.map((cls, i) => (
                  <tr key={cls.name} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="p-4">
                      <Badge className={`${cls.color} font-bold text-sm px-3`}>{cls.name}</Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">{cls.example}</td>
                    <td className="p-4 text-right font-bold text-foreground text-lg">{cls.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center mt-4">
            <Link to="/classification-projets" className="text-sm text-primary hover:underline underline-offset-2">
              Comment les projets sont classés →
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
