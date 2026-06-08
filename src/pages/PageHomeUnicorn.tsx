/**
 * PageHomeUnicorn — Premium AI SaaS homepage matching mockup.
 * Light-blue glassmorphism theme scoped via .unicorn-theme (does NOT leak to global tokens).
 * Mobile-first, mounted at "/" and "/index" via router.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell, ChevronDown, Mic, Image as ImageIcon, FileText, ChevronRight, RefreshCw,
  Home as HomeIcon, Hammer, Thermometer, Droplets, Building2, Zap, Wrench,
  BarChart3, ShieldCheck, Users, Clock, BadgeCheck, Star, ArrowRight,
  QrCode, Menu, TrendingUp, User as UserIcon, Settings, LogOut, Sparkles, CheckCircle2,
} from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexOrbPremium from "@/components/home-unicorn/AlexOrbPremium";
import BottomDockGlass from "@/components/home-unicorn/BottomDockGlass";
import NearbyContractorsCarousel from "@/components/home-unicorn/NearbyContractorsCarousel";
import CinematicArchScenes from "@/components/home-unicorn/CinematicArchScenes";
import PIMIntroBand from "@/components/pim/PIMIntroBand";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "@/styles/unicorn-theme.css";

/* ---------------- Header ---------------- */
function HeaderFloatingGlass() {
  const navigate = useNavigate();
  return (
    <header className="px-3 md:px-4 pt-4 pb-2 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <div
          className="uc-glass-strong rounded-2xl pl-2 pr-2.5 md:pl-3 md:pr-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 flex-shrink-0"
          style={{ borderRadius: 18 }}
        >
          <div
            className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #2563FF, #3B82F6)",
              boxShadow: "0 6px 14px -4px rgba(37,99,255,0.55)",
            }}
          >
            <HomeIcon size={14} color="white" strokeWidth={2.4} />
          </div>
          <span className="font-extrabold tracking-tight text-[13px] md:text-[15px]" style={{ color: "#0B1220" }}>
            UN<span style={{ color: "#94A3B8" }}>PRO</span>
          </span>
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 md:gap-2">
            <span
              className="uc-glass-strong rounded-xl px-2 md:px-3 py-1.5 md:py-2 flex items-center text-[11px] md:text-[12px] font-semibold flex-shrink-0 select-none"
              style={{ borderRadius: 14, color: "#0B1220" }}
              aria-label="Langue"
            >
              FR
            </span>
            <button
              onClick={() => navigate("/memory")}
              className="uc-glass-strong rounded-xl w-9 h-9 md:w-10 md:h-10 flex items-center justify-center relative flex-shrink-0"
              style={{ borderRadius: 14 }}
              aria-label="Notifications"
            >
              <Bell size={15} color="#0B1220" />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#2563FF", boxShadow: "0 0 0 2px white" }}
              />
            </button>
            <button
              onClick={() => navigate("/qr")}
              className="uc-glass-strong rounded-xl w-9 h-9 md:w-10 md:h-10 hidden sm:flex items-center justify-center flex-shrink-0"
              style={{ borderRadius: 14 }}
              aria-label="Mon QR Code"
            >
              <QrCode size={15} color="#0B1220" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="uc-glass-strong rounded-xl pl-1 pr-1.5 md:pr-2 py-1 flex items-center gap-0.5 md:gap-1 flex-shrink-0"
                  style={{ borderRadius: 14 }}
                  aria-label="Profil"
                >
                  <span
                    className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-[11px] md:text-[12px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #6366F1, #3B82F6)" }}
                  >
                    P
                  </span>
                  <ChevronDown size={12} color="#0B1220" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon espace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon size={15} className="mr-2" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/account")}>
                  <Settings size={15} className="mr-2" /> Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/qr")}>
                  <QrCode size={15} className="mr-2" /> Mon QR Code
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/logout")}>
                  <LogOut size={15} className="mr-2" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="uc-glass-strong rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: 14 }}
                aria-label="Menu"
              >
                <Menu size={16} color="#0B1220" />
              </button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[82vw] max-w-[340px] p-0">
              <SheetHeader className="px-5 pt-5 pb-3">
                <SheetTitle className="text-left text-[18px]">Menu</SheetTitle>
              </SheetHeader>
              <nav className="px-3 pb-6 flex flex-col gap-1">
                {[
                  { to: "/", label: "Accueil", icon: HomeIcon },
                  { to: "/dashboard", label: "Croissance", icon: TrendingUp },
                  { to: "/alex", label: "Parler à Alex", icon: Sparkles },
                  { to: "/profile", label: "Profil", icon: UserIcon },
                  { to: "/account", label: "Compte", icon: Settings },
                  { to: "/qr", label: "Mon QR Code", icon: QrCode },
                  { to: "/logout", label: "Déconnexion", icon: LogOut },
                ].map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium hover:bg-muted transition-colors"
                  >
                    <Icon size={18} className="text-muted-foreground" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>

  );
}

/* ---------------- Hero ---------------- */
function HeroAlexOrb({ onTalk }: { onTalk: (hint?: string) => void }) {
  return (
    <section className="px-4 pt-3 pb-2 grid grid-cols-[1.05fr_1fr] gap-2 items-center relative z-10 uc-fade-up">
      <div>
        <h1
          className="font-extrabold leading-[0.98] text-[34px] sm:text-[44px] tracking-[-0.035em]"
          style={{ color: "#0B1220" }}
        >
          Décrivez votre situation.{" "}
          <span className="uc-gradient-text">Alex s'occupe du reste.</span>
        </h1>
        <p
          className="mt-3 text-[13px] sm:text-[14px] leading-snug max-w-[26ch]"
          style={{ color: "#475467" }}
        >
          UNPRO détecte les problèmes, estime les coûts et recommande les meilleurs
          professionnels.
        </p>
      </div>
      <div className="flex flex-col items-center justify-end pr-1 gap-2">
        <button
          type="button"
          onClick={() => onTalk()}
          aria-label="Touchez pour parler à Alex"
          className="group relative rounded-full transition-transform duration-200 ease-out active:scale-[0.96] hover:scale-[1.04] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3B82F6]/40"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <AlexOrbPremium size={170} />
          <span
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            style={{ boxShadow: "0 0 60px 8px rgba(59,130,246,0.45)" }}
          />
        </button>
        <span className="text-[11px] font-semibold text-[#2563FF] sm:hidden">
          Touchez pour parler à Alex
        </span>
      </div>
    </section>
  );
}

/* ---------------- AI Input Card ---------------- */
const QUICK_CHIPS = [
  "Mon entretoit est trop froid",
  "Je veux refaire ma toiture",
  "Analyser mes soumissions",
];

function WaveformMini() {
  return (
    <span className="inline-flex items-end gap-[2px] h-4">
      {[0.4, 0.8, 1, 0.6, 0.9, 0.5].map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-white/85"
          style={{
            height: `${h * 100}%`,
            transformOrigin: "bottom",
            animation: `uc-wave 1.1s ease-in-out infinite`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </span>
  );
}

function AiInputCard({ onTalk }: { onTalk: (hint?: string) => void }) {
  const [activeChip, setActiveChip] = useState(0);
  return (
    <section className="px-4 mt-4 relative z-10 uc-fade-up" style={{ animationDelay: "60ms" }}>
      <div
        className="uc-glass-strong p-4"
        style={{ borderRadius: 28 }}
      >
        {/* Top tab dot */}
        <div className="flex justify-center -mt-6 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#3B82F6", boxShadow: "0 0 0 4px rgba(59,130,246,0.18)" }}
          />
        </div>

        <div className="text-[14px] mb-3" style={{ color: "#94A3B8" }}>
          Décrivez votre situation…
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto uc-no-scrollbar -mx-1 px-1">
          {QUICK_CHIPS.map((c, i) => (
            <button
              key={c}
              onClick={() => {
                setActiveChip(i);
                onTalk(c);
              }}
              className="shrink-0 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all"
              style={{
                background: i === activeChip ? "rgba(37,99,255,0.10)" : "rgba(247,250,255,0.9)",
                color: i === activeChip ? "#2563FF" : "#475467",
                border:
                  i === activeChip ? "1px solid rgba(37,99,255,0.35)" : "1px solid rgba(11,18,32,0.06)",
              }}
            >
              {c}
            </button>
          ))}
          <button
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center ml-auto"
            style={{ background: "white", border: "1px solid rgba(11,18,32,0.08)" }}
            aria-label="Régénérer"
          >
            <RefreshCw size={14} color="#475467" />
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => onTalk()}
          className="uc-cta w-full py-4 rounded-full flex items-center justify-center gap-3 text-[15px] font-semibold relative overflow-hidden"
        >
          <Mic size={18} />
          <span>Parler avec Alex</span>
          <span className="absolute right-5"><WaveformMini /></span>
        </button>

      </div>
    </section>
  );
}

/* ---------------- Actions Carousel (Apple Wallet style) ---------------- */
const ACTIONS_CAROUSEL = [
  { to: "/diagnostic-visuel", label: "Diagnostic visuel IA", sub: "Analyse IA instantanée", icon: ImageIcon, c: "#2563FF", bg: "#EFF6FF" },
  { to: "/analyse-soumissions", label: "Analyser 3 soumissions", sub: "Comparez vos devis", icon: FileText, c: "#2563FF", bg: "#EFF6FF" },
  { to: "/verifier-entrepreneur", label: "Vérifier un entrepreneur", sub: "RBQ, avis, fiabilité", icon: ShieldCheck, c: "#10B981", bg: "#ECFDF5" },
  { to: "/design-ai", label: "Imaginez un décor", sub: "Studio design IA", icon: Sparkles, c: "#8B5CF6", bg: "#F3EEFF" },
];

function HomeQuickActionsGrid() {
  return (
    <section className="mt-4 relative z-10 uc-fade-up" style={{ animationDelay: "120ms" }}>
      {/* Mobile: horizontal snap carousel (Apple Wallet / Tesla style) */}
      <div
        className="md:hidden flex overflow-x-auto uc-no-scrollbar gap-3 px-4 pb-1 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch", scrollPaddingLeft: 16, scrollPaddingRight: 16 }}
      >
        {ACTIONS_CAROUSEL.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="uc-glass-strong uc-hover-lift snap-start shrink-0 w-[78vw] max-w-[300px] h-[108px] flex items-center gap-3 px-4 active:scale-[0.98] transition-transform"
              style={{ borderRadius: 22 }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: a.bg }}
              >
                <Icon size={22} color={a.c} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-tight line-clamp-2" style={{ color: "#0B1220" }}>
                  {a.label}
                </div>
                <div className="text-[11px] mt-1 truncate" style={{ color: "#64748B" }}>
                  {a.sub}
                </div>
              </div>
              <ArrowRight size={16} className="shrink-0 opacity-40" />
            </Link>
          );
        })}
      </div>

      {/* Desktop: 4-col grid */}
      <div className="hidden md:grid grid-cols-4 gap-3 px-4">
        {ACTIONS_CAROUSEL.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="uc-glass-strong uc-hover-lift h-[108px] flex items-center gap-3 px-4"
              style={{ borderRadius: 22 }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: a.bg }}
              >
                <Icon size={22} color={a.c} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold leading-tight line-clamp-2" style={{ color: "#0B1220" }}>
                  {a.label}
                </div>
                <div className="text-[11px] mt-1 truncate" style={{ color: "#64748B" }}>
                  {a.sub}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Symptom chips (intent-first) ---------------- */
const CATEGORIES = [
  { label: "Maison trop chaude", icon: Thermometer, c: "#F97316", bg: "#FFF4E6" },
  { label: "Humidité au grenier", icon: Droplets, c: "#8B5CF6", bg: "#F3EEFF" },
  { label: "Facture Hydro élevée", icon: Zap, c: "#F59E0B", bg: "#FFFBEB" },
  { label: "Condensation fenêtres", icon: Droplets, c: "#0EA5E9", bg: "#E0F2FE" },
  { label: "Fissure inquiétante", icon: HomeIcon, c: "#2563FF", bg: "#EFF6FF" },
  { label: "Moisissure suspecte", icon: Wrench, c: "#8B5CF6", bg: "#F3EEFF" },
  { label: "Condo", icon: Building2, c: "#2563FF", bg: "#EFF6FF" },
];

function CategoryChipsScroll() {
  return (
    <section className="mt-5 relative z-10">
      <div className="flex gap-2 overflow-x-auto uc-no-scrollbar px-4 pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.label}
              className="uc-glass-strong shrink-0 flex flex-col items-center justify-center gap-1.5 py-3 px-4 min-w-[78px] uc-hover-lift"
              style={{ borderRadius: 20 }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: cat.bg }}
              >
                <Icon size={20} color={cat.c} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "#0B1220" }}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Live stats ---------------- */
function LiveStatsCard() {
  const stats = [
    { icon: BarChart3, c: "#2563FF", bg: "#EFF6FF", value: "4 238", label: "analyses aujourd'hui", delta: "+12%" },
    { icon: ShieldCheck, c: "#10B981", bg: "#ECFDF5", value: "312", label: "entrepreneurs certifiés", delta: "+8%" },
    { icon: Users, c: "#8B5CF6", bg: "#F3EEFF", value: "98%", label: "satisfaction clients", delta: "+3%" },
    { icon: Clock, c: "#F59E0B", bg: "#FFFBEB", value: "24/7", label: "assistance IA disponible", delta: "En ligne", online: true },
  ];
  return (
    <section className="px-4 mt-4 relative z-10">
      <div className="uc-glass-strong p-4 grid grid-cols-2 gap-y-4 gap-x-3" style={{ borderRadius: 24 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-start gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: s.bg }}
              >
                <Icon size={16} color={s.c} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-[18px] font-extrabold leading-tight" style={{ color: "#0B1220" }}>
                  {s.value}
                </div>
                <div className="text-[10px] leading-tight" style={{ color: "#667085" }}>
                  {s.label}
                </div>
                <div
                  className="text-[10px] font-semibold mt-0.5 flex items-center gap-1"
                  style={{ color: s.online ? "#10B981" : "#10B981" }}
                >
                  {s.online && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />}
                  {s.delta}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorksCards() {
  const steps = [
    { n: 1, title: "Détection IA", desc: "Vous décrivez, envoyez une photo ou parlez. Alex détecte le problème." },
    { n: 2, title: "Analyse intelligente", desc: "Alex comprend, analyse et estime les coûts avec précision." },
    { n: 3, title: "Recommandation", desc: "Alex recommande les meilleures actions selon votre propriété." },
    { n: 4, title: "Solution", desc: "Recevez une recommandation personnalisée ou prenez rendez-vous avec le professionnel le mieux adapté." },
  ];
  return (
    <section className="px-4 mt-6 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-extrabold tracking-tight" style={{ color: "#0B1220" }}>
          Comment fonctionne UNPRO
        </h2>
        <Link to="/comment-ca-marche" className="text-[12px] font-semibold" style={{ color: "#2563FF" }}>
          Voir en détail
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto uc-no-scrollbar -mx-4 px-4 pb-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-stretch shrink-0">
            <div
              className="uc-glass-strong p-3 w-[180px] flex flex-col uc-hover-lift"
              style={{ borderRadius: 22 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#2563FF,#3B82F6)",
                    boxShadow: "0 6px 14px -4px rgba(37,99,255,0.55)",
                  }}
                >
                  {s.n}
                </div>
                <div className="text-[13px] font-bold leading-tight" style={{ color: "#0B1220" }}>
                  {s.title}
                </div>
              </div>
              <p className="text-[11px] leading-snug" style={{ color: "#667085" }}>
                {s.desc}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="self-center px-1">
                <ArrowRight size={14} color="#94A3B8" />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Contractor split ---------------- */
function ContractorAippSplit() {
  const benefits = [
    "Rendez-vous exclusifs",
    "Recommandations IA",
    "Visibilité locale",
    "Profil optimisé IA",
  ];
  return (
    <section className="px-4 mt-6 mb-8 relative z-10">
      {/* Section eyebrow header (outside card) */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className="text-[11px] font-bold tracking-[0.18em] uppercase"
          style={{ color: "#3B82F6" }}
        >
          Espace entrepreneurs
        </span>
        <span
          aria-hidden
          className="flex-1 h-px"
          style={{
            background:
              "linear-gradient(90deg, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 100%)",
          }}
        />
      </div>

      <div
        className="relative overflow-hidden p-5"
        style={{
          borderRadius: 24,
          background:
            "linear-gradient(135deg, #0B1430 0%, #131B3D 55%, #1B1F4A 100%)",
          border: "1px solid rgba(99,130,255,0.35)",
          boxShadow:
            "0 0 0 1px rgba(99,130,255,0.25), 0 30px 80px -30px rgba(59,130,246,0.65), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 70%)",
          }}
        />

        <div className="relative">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.14em] uppercase"
            style={{
              background: "rgba(99,130,255,0.16)",
              border: "1px solid rgba(147,170,255,0.30)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <Sparkles size={11} /> Espace entrepreneurs
          </div>

          <h3
            className="text-[18px] font-extrabold leading-tight tracking-tight mt-3"
            style={{ color: "#FFFFFF" }}
          >
            Faites partie des entrepreneurs recommandés.
          </h3>

          <p className="text-[12px] mt-2 leading-relaxed" style={{ color: "#C6CFEE" }}>
            UNPRO recommande les professionnels selon leur expertise, leurs résultats
            et leur compatibilité avec chaque projet.
          </p>
          <p className="text-[12px] mt-1 font-medium" style={{ color: "#A6B0D8" }}>
            Pas de leads partagés. Pas de course aux soumissions.
          </p>

          <p
            className="text-[11px] mt-3 italic leading-snug"
            style={{ color: "#93A4D9" }}
          >
            Les propriétaires ne recherchent plus seulement des entrepreneurs.
            Ils demandent à l'IA qui elle recommande.
          </p>

          {/* Single primary CTA */}
          <div className="mt-4">
            <Link
              to="/entrepreneur/join"
              className="uc-cta block w-full sm:w-auto sm:inline-block px-6 py-3 rounded-full text-[13px] font-bold text-center"
            >
              Activer mon profil
            </Link>
          </div>

          {/* Micro benefits */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4">
            {benefits.map((b) => (
              <div
                key={b}
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: "rgba(255,255,255,0.82)" }}
              >
                <CheckCircle2 size={13} color="#7CF0B8" strokeWidth={2.4} />
                {b}
              </div>
            ))}
          </div>

          {/* Recommended preview wrapper */}
          <div
            className="mt-5 p-2.5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgba(255,255,255,0.70)" }}
              >
                Exemple d'entrepreneur recommandé
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(59,130,246,0.20)",
                  border: "1px solid rgba(147,170,255,0.35)",
                  color: "#DCE6FF",
                }}
              >
                <Sparkles size={10} /> Recommandé par Alex
              </span>
            </div>
            <NearbyContractorsCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================== */
export default function PageHomeUnicorn() {
  const { openAlex } = useAlexVoice();
  const onTalk = (hint?: string) => openAlex("home_intent", hint);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Concierge IA québécois. UNPRO détecte les problèmes, estime les coûts et recommande les meilleurs professionnels.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Concierge IA résidentiel",
  };

  return (
    <>
      <Helmet>
        <title>UNPRO — Décrivez votre situation. Alex s'occupe du reste.</title>
        <meta
          name="description"
          content="UNPRO détecte les problèmes, estime les coûts et recommande les meilleurs professionnels au Québec. Parlez à Alex."
        />
        <meta property="og:title" content="UNPRO — Alex s'occupe du reste" />
        <meta
          property="og:description"
          content="Concierge IA québécois. Décrivez votre situation, Alex analyse et recommande."
        />
        <meta name="theme-color" content="#F7FAFF" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="unicorn-theme min-h-screen pb-28 relative overflow-x-hidden">
        <CinematicArchScenes />
        <HeaderFloatingGlass />
        <HeroAlexOrb onTalk={onTalk} />
        <AiInputCard onTalk={onTalk} />
        <HomeQuickActionsGrid />
        <LiveStatsCard />
        <PIMIntroBand />
        <HowItWorksCards />
        <ContractorAippSplit />
        <BottomDockGlass />
      </div>
    </>
  );
}
