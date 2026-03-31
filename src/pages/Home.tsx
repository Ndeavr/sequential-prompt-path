import { Link, useNavigate } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { trackEvent } from "@/services/eventTrackingService";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import {
  Shield, ArrowRight, Star, Brain,
  MessageCircle, Heart, HardHat,
  FileText, Trophy, CheckCircle2,
  BarChart3, Zap, ShieldCheck, Camera,
  Award, Users, FolderOpen,
  Building, Home as HomeIcon, Briefcase,
  Sparkles,
} from "lucide-react";
import HeroSection from "@/components/home/HeroSection";
import MainLayout from "@/layouts/MainLayout";
import { motion } from "framer-motion";
import { useRef } from "react";
import FloatingAlexRobot from "@/components/home/FloatingAlexRobot";
import unproRobot from "@/assets/unpro-robot.png";
import avatarsGroup from "@/assets/avatars-group.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const sectionFade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const Home = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const alexSectionRef = useRef<HTMLElement>(null);

  const handleCta = (destination: string, label?: string) => {
    try {
      trackEvent({ eventType: "rendezvous_click", category: "matching", metadata: { label, destination, page: "/" } });
    } catch {}
    navigate(destination);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "UNPRO",
    "description": "Service intelligent de jumelage avec rendez-vous garantis entre propriétaires et entrepreneurs vérifiés au Québec.",
    "url": "https://unpro.ca",
    "areaServed": { "@type": "Place", "name": "Quebec" },
    "provider": { "@type": "Organization", "name": "UNPRO", "url": "https://unpro.ca" },
    "serviceType": "Jumelage entrepreneur résidentiel",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Pourquoi éviter les 3 soumissions ?", "acceptedAnswer": { "@type": "Answer", "text": "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet." } },
      { "@type": "Question", "name": "Est-ce que le rendez-vous est garanti ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui. Chaque demande est transformée en rendez-vous confirmé avec un entrepreneur qualifié." } },
      { "@type": "Question", "name": "Comment UNPRO choisit l'entrepreneur ?", "acceptedAnswer": { "@type": "Answer", "text": "Le système analyse votre projet, localisation et disponibilité pour trouver le meilleur match." } },
    ]
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Rendez-vous garantis avec entrepreneurs vérifiés | IA 24/7</title>
        <meta name="description" content="Fini les 3 soumissions inutiles. Décrivez votre projet et obtenez un rendez-vous confirmé avec un entrepreneur qualifié. IA Alex 24/7." />
        <meta property="og:title" content="UNPRO — Rendez-vous garantis avec entrepreneurs vérifiés" />
        <meta property="og:description" content="UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="flex flex-col">
        <FloatingAlexRobot alexSectionRef={alexSectionRef} />

        {/* ═══ HERO ═══ */}
        <HeroSection />

        {/* ═══ MATCH REVEAL — "Plus besoin de comparer 3 soumissions" ═══ */}
        <section className="px-5 py-14 md:py-20">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-8">
              <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
                Plus besoin de comparer <span className="text-primary">3 soumissions.</span>
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                Rencontrez le bon professionnel du premier coup.
              </p>
            </motion.div>

            {/* Alex Bubble + Match Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {/* Alex bubble */}
              <div className="flex items-start gap-3 max-w-md">
                <div className="relative shrink-0">
                  <img src={unproRobot} alt="Alex" className="h-11 w-11 rounded-full object-cover" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-card/80 backdrop-blur-md border border-border/60 shadow-[var(--shadow-md)]">
                  <p className="text-sm font-medium text-foreground">J'ai trouvé le match parfait pour vous.</p>
                </div>
              </div>

              {/* Match Card */}
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.97, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="rounded-3xl p-5 sm:p-6 border border-border/60 shadow-[var(--shadow-xl)]"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.85) 100%)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-muted/50 border border-border/50 shrink-0 flex items-center justify-center">
                    <img src={unproRobot} alt="Contractor" className="h-12 w-12 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground">Isolation Solution Royal</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Recommandé UNPRO
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        92/100
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>📍 Laval / Montréal</span>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="mt-4 space-y-1.5">
                  {["Isolation d'entretoit", "Vermiculite", "Barrage de glace"].map((svc) => (
                    <div key={svc} className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{svc}</span>
                    </div>
                  ))}
                </div>

                {/* Stars + testimonial */}
                <div className="mt-4 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-1 mb-1.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "Très professionnel, travail impeccable, économie de chauffage notable."
                  </p>
                </div>

                {/* CTAs */}
                <div className="mt-5 flex gap-2.5">
                  <Link
                    to="/pro/isolation-solution-royal"
                    className="flex-1 h-11 rounded-xl flex items-center justify-center text-xs font-bold bg-card border border-border text-foreground hover:bg-muted/50 transition-all active:scale-[0.97]"
                  >
                    Voir le profil
                  </Link>
                  <button
                    onClick={() => handleCta("/describe-project", "Planifier un rendez-vous")}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cta-gradient"
                  >
                    Planifier un rendez-vous <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═══ PASSEPORT CARDS ═══ */}
        <section className="px-5 py-10">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: HomeIcon,
                  title: "Passeport Maison",
                  desc: "Documents, historique, valeur, travaux",
                  cta: "Ouvrir Passeport Maison",
                  route: "/dashboard/property",
                  color: "text-primary",
                  bgColor: "bg-primary/8",
                },
                {
                  icon: Building,
                  title: "Passeport Condo",
                  desc: "Gestion copropriété, conformité, documents",
                  cta: "Ouvrir Passeport Condo",
                  route: "/dashboard/syndicate",
                  color: "text-secondary",
                  bgColor: "bg-secondary/8",
                },
                {
                  icon: Briefcase,
                  title: "Je suis entrepreneur",
                  desc: "Profil IA, visibilité, rendez-vous qualifiés",
                  cta: "Accéder à mon espace",
                  route: "/pro",
                  color: "text-accent",
                  bgColor: "bg-accent/8",
                },
              ].map((card, i) => (
                <motion.div key={card.title} variants={fadeUp} custom={i}>
                  <Link
                    to={card.route}
                    className="premium-card rounded-2xl p-3 sm:p-4 h-full flex flex-col text-center hover:shadow-lg transition-all group"
                  >
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${card.bgColor} flex items-center justify-center mx-auto mb-2`}>
                      <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                    </div>
                    <p className="font-display text-xs sm:text-sm font-bold text-foreground leading-tight">{card.title}</p>
                    <p className="text-[10px] sm:text-xs mt-1 text-muted-foreground leading-snug hidden sm:block">{card.desc}</p>
                    <div className="mt-auto pt-2">
                      <span className={`inline-block text-[10px] sm:text-xs font-bold ${card.color} group-hover:underline`}>
                        {card.cta}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ VOTRE MAISON A ENFIN UN CERVEAU ═══ */}
        <section className="px-5 py-14 md:py-20">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-8">
              <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
                Votre maison a enfin un <span className="text-primary">cerveau.</span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="premium-card rounded-3xl p-5 sm:p-7 space-y-5">
                {/* Tabs mockup */}
                <div className="flex rounded-xl overflow-hidden border border-border/60">
                  {["Factures", "Travaux", "Dossier Maison"].map((tab, i) => (
                    <button
                      key={tab}
                      className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                        i === 0 ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Factures", value: "43", sub: "Payé", stat: "93 projets" },
                    { label: "Dossiers", value: "80", sub: "Fiels", stat: "190 10186" },
                    { label: "Dossier Maison", value: "10", sub: "actains", stat: "960 1090" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl p-3 bg-muted/40 border border-border/40">
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCta("/score-maison", "Voir mon score IA")}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cta-gradient"
                >
                  Voir mon score IA <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="px-5 py-10">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h2 className="section-title mb-8 text-center">Comment ça marche ?</h2>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3">
              {[
                { step: 1, icon: FileText, title: "Décrivez", subtitle: "votre projet", iconColor: "text-primary" },
                { step: 2, icon: Brain, title: "UNPRO analyse", subtitle: "et recommande", iconColor: "text-accent" },
                { step: 3, icon: Trophy, title: "Rencontrez", subtitle: "le bon entrepreneur", iconColor: "text-warning" },
              ].map((item, i) => (
                <motion.div key={item.step} variants={fadeUp} custom={i}>
                  <div className="premium-card rounded-2xl p-3 sm:p-5 text-center h-full relative overflow-hidden">
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-primary-foreground">
                      {item.step}
                    </div>
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center mx-auto mb-2 bg-muted/60 border border-border/50">
                      <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${item.iconColor}`} />
                    </div>
                    <p className="font-display text-sm sm:text-base font-bold text-foreground">{item.title}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">{item.subtitle}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ SOCIAL PROOF ═══ */}
        <section className="px-5 py-10">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-6">
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-primary">+10 000</p>
                  <p className="text-xs font-medium text-muted-foreground">projets réussis</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-0.5 mb-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />)}
                    <span className="font-display text-lg font-bold ml-1 text-foreground">4.9</span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">2,500+ avis</p>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCta("/describe-project", "Décrire mon projet")}
                className="w-full h-14 rounded-full flex items-center justify-center gap-3 text-sm font-bold cta-gradient"
              >
                Décrivez votre projet
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white/25">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>

              <div className="trust-row mt-4">
                {[
                  { icon: CheckCircle2, label: "Gratuit & Rapide" },
                  { icon: Shield, label: "Sécurisé" },
                  { icon: Heart, label: "Sans engagement" },
                ].map(b => (
                  <div key={b.label} className="trust-item">
                    <b.icon />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section className="px-5 py-12">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-8">
              <h2 className="section-title">Ce que nos utilisateurs disent</h2>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-3 gap-3">
              {[
                { name: "Marie-Claude D.", role: "Propriétaire · Montréal", text: "L'analyse IA m'a fait économiser 3 200$ sur ma rénovation." },
                { name: "Jean-François L.", role: "Entrepreneur · Laval", text: "Depuis UNPRO, je reçois des demandes qualifiées. Mon taux de conversion a doublé." },
                { name: "Sophie T.", role: "Propriétaire · Québec", text: "Le Score Maison m'a permis de planifier un budget réaliste sur 5 ans." },
              ].map((t, i) => (
                <motion.div key={t.name} variants={fadeUp} custom={i}>
                  <div className="premium-card rounded-2xl p-4 h-full space-y-2.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className="h-3 w-3 fill-current text-warning" />)}
                    </div>
                    <p className="text-xs leading-relaxed font-medium text-foreground/85">"{t.text}"</p>
                    <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                      <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-border/60">
                        <img src={avatarsGroup} alt={t.name} className="h-full w-full object-cover" style={{ objectPosition: `${i * 30 + 10}% 15%` }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="px-5 py-12">
          <div className="max-w-3xl mx-auto">
            <motion.div variants={sectionFade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-6">Questions fréquentes</h2>
              <div className="space-y-3">
                {[
                  { q: "Pourquoi éviter les 3 soumissions ?", a: "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet." },
                  { q: "Est-ce que le rendez-vous est garanti ?", a: "Oui. Chaque demande est transformée en rendez-vous confirmé avec un entrepreneur qualifié et vérifié." },
                  { q: "Comment UNPRO choisit l'entrepreneur ?", a: "Le système analyse votre projet, votre localisation et la disponibilité des professionnels pour trouver le meilleur match." },
                  { q: "Est-ce plus rapide que les soumissions ?", a: "Oui. Au lieu d'attendre plusieurs réponses, vous obtenez un rendez-vous garanti directement avec le bon entrepreneur." },
                ].map((faq) => (
                  <details key={faq.q} className="group premium-card rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors">
                      {faq.q}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">{faq.a}</div>
                  </details>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="px-5 py-14">
          <div className="max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="relative rounded-3xl p-8 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary)), hsl(var(--accent)))" }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[120%] rounded-full blur-3xl bg-white/10" />
                </div>
                <div className="relative z-10 space-y-4">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                    Un seul entrepreneur. Le bon.<br/>Rendez-vous garanti.
                  </h2>
                  <button
                    onClick={() => handleCta("/describe-project", "Obtenir mon rendez-vous")}
                    className="h-12 rounded-full px-8 text-sm font-bold bg-white text-primary hover:bg-white/90 transition-all active:scale-[0.97]"
                  >
                    Obtenir mon rendez-vous <ArrowRight className="h-4 w-4 ml-1.5 inline" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Home;
