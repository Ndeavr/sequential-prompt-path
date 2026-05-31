/**
 * PageHomeCinematic — Premium cinematic home (route "/").
 * Mobile-first, dark cinematic, AI-native feeling.
 * Replaces PageHomeUnicorn rendering. Hard-coded tokens scoped to this page only.
 */
import { useState, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, FileSearch, Gauge, MessageCircle, ShieldCheck,
  Thermometer, Droplets, Hammer, Snowflake, Truck, Wind, Home as HomeIcon, Layers,
} from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import heroImg from "@/assets/home-cinematic-hero.jpg";

const RecommendedProsRail = lazy(() => import("@/components/home-cinematic/RecommendedProsRail"));

const CHIPS: { label: string; icon: any }[] = [
  { label: "Trop froid", icon: Snowflake },
  { label: "Fuite toiture", icon: Droplets },
  { label: "Isolation", icon: Layers },
  { label: "Cuisine", icon: Hammer },
  { label: "Déménagement", icon: Truck },
  { label: "Thermopompe", icon: Wind },
  { label: "Humidité", icon: Droplets },
  { label: "Agrandissement", icon: HomeIcon },
];

const QUICK_ACTIONS = [
  { title: "Analyser 3 soumissions", desc: "Comparaison IA instantanée", icon: FileSearch, feat: "quote_compare" },
  { title: "Score Maison", desc: "Évaluez la santé de votre maison", icon: Gauge, feat: "home_score" },
  { title: "Parler avec Alex", desc: "Conseillère IA disponible 24/7", icon: MessageCircle, feat: "chat" },
  { title: "Vérifier un entrepreneur", desc: "Confiance · RBQ · Avis", icon: ShieldCheck, feat: "verify_pro" },
];

export default function PageHomeCinematic() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [intent, setIntent] = useState("");

  const launch = (text: string) => {
    const value = text.trim();
    if (!value) return;
    openAlex("home_intent", value);
  };

  return (
    <>
      <Helmet>
        <title>UNPRO — Trouvez le bon entrepreneur du premier coup</title>
        <meta
          name="description"
          content="UNPRO analyse votre besoin, compare les options et recommande les meilleurs entrepreneurs au Québec. Recommandation IA, prise de rendez-vous directe."
        />
        <meta name="theme-color" content="#050816" />
      </Helmet>

      <main className="cinema-root min-h-screen text-white antialiased">
        <style>{`
          .cinema-root {
            background:
              radial-gradient(120% 80% at 20% 0%, hsl(217 91% 60% / 0.18) 0%, transparent 55%),
              radial-gradient(120% 80% at 80% 100%, hsl(189 94% 55% / 0.14) 0%, transparent 60%),
              linear-gradient(180deg, #050816 0%, #07091a 60%, #050816 100%);
            font-feature-settings: "ss01","cv11";
          }
          .glass {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
          }
          .glass-strong {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
          }
          .glow-cyan { box-shadow: 0 10px 60px -10px hsl(189 94% 55% / 0.35); }
          .glow-blue { box-shadow: 0 10px 60px -10px hsl(217 91% 60% / 0.45); }
          .h-hero {
            font-family: Inter, system-ui, sans-serif;
            letter-spacing: -0.04em;
            line-height: 1.02;
          }
          .ease-cinema { transition: all 420ms cubic-bezier(.22,1,.36,1); }
          .float-slow { animation: floatSlow 8s ease-in-out infinite; }
          .glow-pulse { animation: glowPulse 4s ease-in-out infinite; }
          @keyframes floatSlow {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes glowPulse {
            0%,100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.04); }
          }
          .grain {
            background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
            background-size: 3px 3px;
          }
          .lift:hover { transform: translateY(-2px); }
        `}</style>

        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden">
          {/* Header */}
          <header className="relative z-20 flex items-center justify-between px-5 pt-5">
            <Link to="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl grid place-items-center glow-blue"
                style={{ background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(189 94% 55%))" }}
              >
                <HomeIcon size={16} strokeWidth={2.4} />
              </div>
              <span className="font-bold text-[15px] tracking-tight">
                UN<span className="text-white/50">PRO</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="glass rounded-full px-4 py-2 text-xs font-semibold ease-cinema lift"
              >
                Connexion
              </Link>
            </div>
          </header>

          {/* Hero image background */}
          <div className="relative">
            <div className="relative mx-auto max-w-[1100px] px-5 pt-8 md:pt-14">
              <div className="relative rounded-[32px] overflow-hidden glass-strong glow-cyan">
                <img
                  src={heroImg}
                  alt="Maison résidentielle premium avec lumière cinématique"
                  width={1024}
                  height={1280}
                  className="w-full h-[44vh] min-h-[340px] max-h-[520px] object-cover opacity-90"
                  fetchPriority="high"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(5,8,22,0) 0%, rgba(5,8,22,0.35) 50%, rgba(5,8,22,0.95) 100%)",
                  }}
                />
                <div className="absolute inset-0 grain opacity-40 pointer-events-none" />

                {/* Floating Alex orb */}
                <div
                  className="absolute top-6 right-6 w-14 h-14 rounded-full grid place-items-center float-slow"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, hsl(189 94% 75%), hsl(217 91% 50%))",
                    boxShadow:
                      "0 0 40px hsl(189 94% 55% / 0.6), inset 0 0 20px rgba(255,255,255,0.3)",
                  }}
                  aria-hidden
                >
                  <Sparkles size={20} className="glow-pulse" />
                </div>
              </div>
            </div>

            {/* Hero text + input */}
            <div className="relative z-10 mx-auto max-w-[700px] px-5 -mt-24 md:-mt-32 pb-8">
              <h1 className="h-hero text-[40px] md:text-[64px] font-semibold text-white">
                Trouvez le bon entrepreneur{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, hsl(189 94% 70%), hsl(217 91% 75%))",
                  }}
                >
                  du premier coup.
                </span>
              </h1>
              <p className="mt-4 text-[15px] md:text-[17px] text-white/70 leading-relaxed max-w-[560px]">
                UNPRO analyse votre besoin, compare les options et recommande les meilleurs entrepreneurs.
              </p>

              {/* Mega input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  launch(intent || "J'ai besoin d'aide");
                }}
                className="mt-6"
              >
                <div className="glass-strong rounded-[28px] p-2 flex items-center gap-2 ease-cinema">
                  <input
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    placeholder="Décrivez votre problème ou votre projet…"
                    className="flex-1 bg-transparent outline-none px-4 py-3 text-[15px] placeholder:text-white/40"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl px-4 py-3 text-sm font-semibold text-[#050816] ease-cinema lift glow-cyan"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(189 94% 65%), hsl(217 91% 65%))",
                    }}
                  >
                    <span className="hidden sm:inline">Analyser mon projet</span>
                    <ArrowRight size={18} className="sm:hidden" />
                  </button>
                </div>

                {/* Chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {CHIPS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setIntent(label);
                        launch(label);
                      }}
                      className="glass rounded-full px-3.5 py-2 text-xs font-medium text-white/85 inline-flex items-center gap-1.5 ease-cinema lift"
                    >
                      <Icon size={13} className="text-cyan-300" />
                      {label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ============ QUICK ACTIONS ============ */}
        <section className="px-5 pt-2 pb-10">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="h-hero text-2xl md:text-3xl font-semibold mb-5">
              Que voulez-vous faire?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.title}
                  onClick={() => openAlex(a.feat, a.title)}
                  className="glass rounded-3xl p-4 md:p-5 text-left ease-cinema lift group"
                >
                  <div
                    className="w-10 h-10 rounded-2xl grid place-items-center mb-3 ease-cinema group-hover:glow-cyan"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(59,130,246,0.18))",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <a.icon size={18} className="text-cyan-200" />
                  </div>
                  <div className="font-semibold text-[14px] leading-snug">{a.title}</div>
                  <div className="text-[12px] text-white/55 mt-1 leading-snug">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============ RECOMMENDED PROS ============ */}
        <section className="px-5 py-10">
          <div className="mx-auto max-w-[1100px]">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs font-semibold tracking-widest text-cyan-300/80 uppercase">
                  Recommandation IA
                </p>
                <h2 className="h-hero text-2xl md:text-3xl font-semibold mt-1">
                  Entrepreneurs recommandés près de chez vous
                </h2>
              </div>
            </div>
            <Suspense
              fallback={
                <div className="glass rounded-3xl h-64 grid place-items-center text-white/50 text-sm">
                  Chargement des recommandations…
                </div>
              }
            >
              <RecommendedProsRail />
            </Suspense>
          </div>
        </section>

        {/* ============ SOCIAL PROOF ============ */}
        <section className="px-5 py-14">
          <div className="mx-auto max-w-[900px] glass-strong rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 0%, hsl(189 94% 55% / 0.25), transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="flex justify-center -space-x-3 mb-5">
                {[
                  "from-amber-300 to-rose-400",
                  "from-cyan-300 to-blue-500",
                  "from-violet-300 to-fuchsia-500",
                  "from-emerald-300 to-cyan-500",
                  "from-orange-300 to-pink-500",
                ].map((g, i) => (
                  <div
                    key={i}
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${g} border-2 border-[#050816]`}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="h-hero text-3xl md:text-5xl font-semibold">+10 000 projets accompagnés</div>
              <p className="mt-3 text-white/65 text-[15px]">
                Une recommandation, pas une liste. Une décision en moins de 30 secondes.
              </p>
              <button
                onClick={() => openAlex("home_cta", "Je veux démarrer")}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-[#050816] ease-cinema lift glow-cyan"
                style={{
                  background: "linear-gradient(135deg, hsl(189 94% 65%), hsl(217 91% 65%))",
                }}
              >
                Démarrer maintenant <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <footer className="px-5 pb-10 text-center text-xs text-white/40">
          UNPRO · Concierge IA · Made in Québec ⚜️
        </footer>
      </main>
    </>
  );
}
