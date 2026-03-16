import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

const FAQS = [
  {
    q: "Les rendez-vous sont-ils partagés ?",
    a: "Non. Chaque projet est envoyé à un seul entrepreneur à la fois. C'est ce qui fait la force d'UNPRO.",
  },
  {
    q: "Comment recevoir plus de rendez-vous ?",
    a: "Les plans Premium et Élite reçoivent plus de projets grâce à leur visibilité prioritaire et leur accès aux classes supérieures.",
  },
  {
    q: "Comment fonctionne l'auto-acceptation ?",
    a: "Les plans Premium et supérieurs peuvent activer l'auto-acceptation pour les projets correspondant à leurs filtres, ce qui garantit une réponse immédiate.",
  },
  {
    q: "C'est vraiment gratuit pour les propriétaires ?",
    a: "Oui. Créer un profil, décrire un projet et réserver un rendez-vous est 100% gratuit pour les propriétaires.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Absolument. Vous pouvez upgrader ou downgrader votre plan sans frais cachés.",
  },
  {
    q: "Qu'est-ce qu'un territoire exclusif ?",
    a: "Un territoire est une combinaison ville + catégorie de service. Le plan Signature permet de réserver l'exclusivité sur un territoire.",
  },
];

export default function PricingFaq() {
  return (
    <section className="px-5 py-16">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Questions fréquentes</h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div key={faq.q} variants={fadeUp} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="glass-card-elevated rounded-2xl p-5">
                <p className="font-semibold text-foreground mb-1.5">{faq.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
