/**
 * UNPRO — "Vérifier un entrepreneur au Québec"
 * High-conversion SEO landing page with FAQ schema, structured headings,
 * and conversion funnels into the verification engine.
 */
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import SeoFaqSection from "@/seo/components/SeoFaqSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCodeCard from "@/components/sharing/QRCodeCard";
import {
  Shield, Search, ArrowRight, Upload, FileText, Building2,
  Fingerprint, Eye, Phone, Globe, CheckCircle2, AlertCircle,
  MessageSquare, ShieldCheck, ShieldAlert, UserCheck, FileSearch,
  Scale, HelpCircle, ChevronRight, Zap, Lock, ExternalLink, QrCode,
} from "lucide-react";

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

/* ─── Section wrapper ─── */
function Section({ children, className = "", muted = false, id }: { children: React.ReactNode; className?: string; muted?: boolean; id?: string }) {
  return (
    <section id={id} className={`py-16 md:py-24 ${muted ? "bg-muted/30" : ""} ${className}`}>
      <div className="container mx-auto px-4 max-w-4xl">{children}</div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={fadeUp} custom={0} className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
      {eyebrow && <Badge variant="outline" className="mb-3 text-xs font-medium tracking-wide uppercase border-primary/20 text-primary">{eyebrow}</Badge>}
      <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">{title}</h2>
      {subtitle && <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{subtitle}</p>}
    </motion.div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ─── FAQ data ─── */
const FAQS: import("@/seo/data/faqs").SeoFaq[] = [
  { question: "Comment vérifier un entrepreneur au Québec ?", answer: "Vous pouvez commencer par entrer son numéro de téléphone, nom d'entreprise, numéro de licence RBQ, NEQ ou site web dans l'outil UnPRO. Le système recoupe automatiquement plusieurs sources publiques pour évaluer la cohérence de l'identité commerciale.", topics: ["verification", "general"] },
  { question: "Comment trouver le numéro RBQ d'un entrepreneur ?", answer: "Demandez-le directement à l'entrepreneur. Vous pouvez aussi vérifier sur le Registre des détenteurs de licence de la Régie du bâtiment du Québec (RBQ). Si vous avez une soumission ou un contrat, le numéro RBQ devrait y figurer.", topics: ["verification", "rbq"] },
  { question: "Est-ce qu'un numéro de téléphone suffit pour identifier une entreprise ?", answer: "Un numéro de téléphone seul est un signal faible. Plusieurs entreprises peuvent partager un même numéro, ou un entrepreneur peut changer de numéro. UnPRO recommande de fournir au moins deux identifiants (nom + téléphone, ou RBQ + site web) pour une correspondance plus fiable.", topics: ["verification"] },
  { question: "Peut-on vérifier une entreprise à partir d'une soumission ?", answer: "Oui. UnPRO peut analyser une soumission, un contrat ou un devis pour en extraire des indices d'identité : nom, RBQ, téléphone, adresse, montants. Ces informations sont ensuite croisées avec les données publiques disponibles.", topics: ["verification", "soumission"] },
  { question: "Que faire si les informations sont contradictoires ?", answer: "Si UnPRO détecte des incohérences entre le nom sur la soumission, le numéro RBQ et les données publiques, le système vous en informe clairement. Cela ne signifie pas automatiquement une fraude, mais cela mérite une vérification supplémentaire avant de signer.", topics: ["verification"] },
  { question: "Est-ce que « Validé par UnPRO » veut dire certifié légalement ?", answer: "Non. La mention « Validé par UnPRO » indique que notre équipe a vérifié manuellement le dossier interne d'un entrepreneur. Cela ne remplace pas une certification gouvernementale ni un avis juridique. C'est un signal de confiance additionnel, pas une garantie légale.", topics: ["verification", "general"] },
  { question: "Comment comparer plusieurs entrepreneurs plus intelligemment ?", answer: "Utilisez l'outil de comparaison de soumissions d'UnPRO pour analyser jusqu'à 3 devis côte à côte. Le système détecte les écarts de prix, les éléments manquants et les clauses inhabituelles pour vous aider à décider.", topics: ["verification", "soumission"] },
];

/* ─── What we check ─── */
const CHECKS = [
  { icon: FileText, title: "Licence RBQ", desc: "Statut, sous-catégories et validité auprès de la Régie du bâtiment du Québec." },
  { icon: Building2, title: "Registre des entreprises (NEQ)", desc: "Existence légale de l'entreprise au Registraire des entreprises du Québec." },
  { icon: Fingerprint, title: "Cohérence de l'identité", desc: "Recoupement entre le nom commercial, téléphone, site web et profils publics." },
  { icon: FileSearch, title: "Analyse de soumission", desc: "Extraction d'indices d'identité à partir de devis, contrats ou factures téléversés." },
  { icon: ShieldAlert, title: "Détection d'incohérences", desc: "Signaux d'alerte : noms multiples, contacts divergents, coordonnées manquantes." },
  { icon: UserCheck, title: "Profils validés par UnPRO", desc: "Dossiers vérifiés manuellement par notre équipe lorsque disponibles." },
];

/* ─── What we do NOT do ─── */
const NOT_DO = [
  { icon: AlertCircle, text: "Nous n'inventons pas les informations manquantes" },
  { icon: Scale, text: "Nous ne remplaçons pas un avis juridique" },
  { icon: Shield, text: "Nous ne prétendons pas offrir une certification gouvernementale" },
  { icon: HelpCircle, text: "Quand les données sont insuffisantes, nous demandons plus de preuves" },
];

/* ─── Steps ─── */
const STEPS = [
  { num: "1", title: "Entrez un identifiant", desc: "Téléphone, nom d'entreprise, licence RBQ, NEQ ou site web — un seul suffit pour commencer." },
  { num: "2", title: "Ajoutez une preuve si nécessaire", desc: "Téléversez une soumission, carte d'affaires ou contrat pour enrichir la vérification." },
  { num: "3", title: "Consultez les signaux de confiance", desc: "UnPRO recoupe les données publiques et vous montre ce qui est confirmé, incertain ou manquant." },
  { num: "4", title: "Décidez plus sereinement", desc: "Utilisez les résultats pour poser les bonnes questions ou demander des documents supplémentaires." },
];

/* ─── Risks ─── */
const RISKS = [
  { title: "Identité imprécise", desc: "L'entrepreneur n'a pas de coordonnées clairement reliées à un enregistrement public." },
  { title: "Licence floue ou absente", desc: "Le numéro RBQ manque sur la soumission ou ne correspond pas au type de travaux." },
  { title: "Informations contradictoires", desc: "Le nom sur le contrat ne correspond pas au nom de l'entreprise sur les registres." },
  { title: "Soumission incomplète", desc: "Le devis ne précise pas les taxes, les exclusions ou les conditions de paiement." },
  { title: "Entreprise difficile à retracer", desc: "Pas de site web, pas de présence en ligne cohérente, aucune trace publique vérifiable." },
];

/* ─── Page ─── */
export default function VerifyLandingPage() {
  const navigate = useNavigate();
  const [heroInput, setHeroInput] = useState("");

  const handleVerify = () => {
    navigate(`/verifier-un-entrepreneur${heroInput.trim() ? `?q=${encodeURIComponent(heroInput.trim())}` : ""}`);
  };

  return (
    <MainLayout>
      <SeoHead
        title="Vérifier un entrepreneur au Québec — UnPRO"
        description="Vérifiez la licence RBQ, l'identité commerciale et la fiabilité d'un entrepreneur au Québec avant de signer. Outil gratuit de vérification UnPRO."
        canonical="https://unpro.ca/verifier-entrepreneur"
      />

      <div className="min-h-screen bg-background">

        {/* ═══════ HERO ═══════ */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/8 via-transparent to-transparent opacity-60" />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-3xl">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center">
              <motion.div variants={fadeUp} custom={0} className="mb-5">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase">
                  <Shield className="w-4 h-4" />
                  Outil de vérification gratuit
                </div>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold font-display text-foreground leading-[1.12] mb-5">
                Vérifiez un entrepreneur{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  avant de signer
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
                RBQ, numéro de téléphone, site web, carte d'affaires ou soumission : UnPRO vous aide à relier les bonnes informations sans rien inventer.
              </motion.p>

              {/* Search box */}
              <motion.div variants={fadeUp} custom={3} className="max-w-lg mx-auto">
                <GlassCard className="p-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={heroInput}
                        onChange={(e) => setHeroInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                        placeholder="Nom, téléphone, RBQ ou site web"
                        className="pl-10 h-12 border-0 bg-transparent text-sm md:text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label="Identifiant de l'entrepreneur"
                      />
                    </div>
                    <Button onClick={handleVerify} size="lg" className="h-12 px-5 md:px-6 gap-2 font-semibold shrink-0">
                      Vérifier <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>

                <motion.div variants={fadeUp} custom={4} className="flex flex-wrap justify-center gap-3 mt-5">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 rounded-full" onClick={() => navigate("/analyser-document")}>
                    <Upload className="w-3.5 h-3.5" /> Analyser une soumission
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1.5 rounded-full" onClick={() => navigate("/signup")}>
                    <UserCheck className="w-3.5 h-3.5" /> Créer un compte
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ WHY VERIFICATION MATTERS ═══════ */}
        <Section muted id="pourquoi-verifier">
          <SectionTitle
            eyebrow="Risques courants"
            title="Pourquoi vérifier un entrepreneur avant de signer"
            subtitle="Des situations fréquentes qui peuvent coûter cher aux propriétaires québécois."
          />
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {RISKS.map((r, i) => (
              <motion.div key={r.title} variants={fadeUp} custom={i}>
                <GlassCard className="p-5 h-full">
                  <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                    <AlertCircle className="w-4.5 h-4.5 text-warning" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{r.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
          <p className="text-xs text-muted-foreground text-center mt-6 max-w-md mx-auto leading-relaxed">
            Ces situations ne signifient pas automatiquement une fraude. Elles méritent simplement une vérification avant de s'engager.
          </p>
        </Section>

        {/* ═══════ WHAT UNPRO CHECKS ═══════ */}
        <Section id="ce-que-nous-verifions">
          <SectionTitle
            eyebrow="Analyse complète"
            title="Ce que UnPRO vérifie"
            subtitle="Un recoupement méthodique de plusieurs sources publiques, sans rien inventer."
          />
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {CHECKS.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div key={c.title} variants={fadeUp} custom={i}>
                  <GlassCard className="p-5 h-full group hover:-translate-y-0.5 transition-transform duration-300">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1.5">{c.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* ═══════ WHAT UNPRO DOES NOT DO ═══════ */}
        <Section muted id="ce-que-nous-ne-faisons-pas">
          <SectionTitle
            eyebrow="Transparence"
            title="Ce que UnPRO ne fait pas"
            subtitle="La confiance se bâtit aussi sur ce qu'on choisit de ne pas faire."
          />
          <div className="max-w-lg mx-auto">
            <GlassCard className="p-6">
              <div className="space-y-4">
                {NOT_DO.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        </Section>

        {/* ═══════ STEP BY STEP ═══════ */}
        <Section id="comment-ca-fonctionne">
          <SectionTitle
            eyebrow="En 4 étapes"
            title="Comment vérifier un entrepreneur avec UnPRO"
            subtitle="Un processus simple, transparent et sans engagement."
          />
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={stagger}
            className="max-w-xl mx-auto space-y-0"
          >
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fadeUp} custom={i} className="relative flex gap-5 pb-8 last:pb-0">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[22px] top-12 bottom-0 w-px bg-gradient-to-b from-primary/20 to-transparent" />
                )}
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold font-display text-primary">{step.num}</span>
                </div>
                <div className="pt-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Inline CTA */}
          <div className="mt-10 text-center">
            <Button size="lg" className="gap-2 font-semibold h-12 px-6" onClick={handleVerify}>
              <ShieldCheck className="w-4 h-4" /> Vérifier un entrepreneur maintenant
            </Button>
          </div>
        </Section>

        {/* ═══════ FAQ ═══════ */}
        <Section muted id="faq">
          <SectionTitle
            eyebrow="Questions fréquentes"
            title="Tout savoir sur la vérification d'entrepreneurs"
          />
          <div className="max-w-2xl mx-auto">
            <SeoFaqSection faqs={FAQS} heading="" />
          </div>
        </Section>

        {/* ═══════ INTERNAL LINKS — SEO ═══════ */}
        <Section id="ressources">
          <SectionTitle title="Explorer par ville ou métier" subtitle="Des pages spécialisées pour chaque type de vérification." />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { label: "Vérifier à Montréal", to: "/ville/montreal" },
              { label: "Vérifier à Québec", to: "/ville/quebec" },
              { label: "Vérifier à Laval", to: "/ville/laval" },
              { label: "Couvreurs", to: "/profession/couvreur" },
              { label: "Électriciens", to: "/profession/electricien" },
              { label: "Plombiers", to: "/profession/plombier" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 p-3 text-sm font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors group"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {link.label}
              </Link>
            ))}
          </div>
        </Section>

        {/* ═══════ FINAL CTA BLOCK ═══════ */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-primary/5 pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10 max-w-2xl text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <motion.div variants={fadeUp} custom={0}>
                <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-4" />
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-2xl md:text-3xl font-bold font-display text-foreground mb-4">
                Avant de signer, vérifiez ce que le prix ne dit pas
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Vérifiez un entrepreneur, analysez une soumission ou demandez l'aide d'Alex — gratuitement.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="gap-2 font-semibold h-12 px-6" onClick={handleVerify}>
                  <ShieldCheck className="w-4 h-4" /> Vérifier un entrepreneur
                </Button>
                <Button size="lg" variant="outline" className="gap-2 font-semibold h-12 px-6" onClick={() => navigate("/analyser-document")}>
                  <Upload className="w-4 h-4" /> Analyser une soumission
                </Button>
                <Button size="lg" variant="ghost" className="gap-2 font-semibold h-12 px-6 text-primary" onClick={() => navigate("/alex")}>
                  <MessageSquare className="w-4 h-4" /> Parler à Alex
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="mt-6">
                <Button variant="link" className="text-xs text-muted-foreground gap-1" onClick={() => navigate("/signup")}>
                  Créer un compte UnPRO gratuit <ExternalLink className="w-3 h-3" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ TRUST FOOTER ═══════ */}
        <section className="py-8 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-muted-foreground/50" />
              <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Engagement UnPRO</span>
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
              UnPRO n'invente jamais les données manquantes. En cas d'ambiguïté,
              nous demandons plus de preuves plutôt que de deviner.
              Ces résultats sont estimatifs et ne constituent pas une certification légale.
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
