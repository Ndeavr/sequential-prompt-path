/**
 * UNPRO entrepreneurs hero — premium, concise, bilingual.
 * Presentation-only update: preserve tracking and the existing activation/audit routes.
 */
import { ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import LanguageToggle, { useLanguage } from "@/components/ui/LanguageToggle";
import UnproLogo from "@/components/brand/UnproLogo";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

/** Pure SVG art: lightweight, scalable, no mock form or external image assets. */
function HouseLineArt({ fr }: { fr: boolean }) {
  return (
    <svg
      viewBox="0 0 720 400"
      className="h-auto w-full max-w-[620px]"
      role="img"
      aria-labelledby="unpro-house-art-title"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="unpro-house-art-title">
        {fr ? "Maison en traits lumineux entourée de métiers du bâtiment" : "Glowing line-art house surrounded by home-service trade icons"}
      </title>
      <defs>
        <linearGradient id="unpro-house-line" x1="0%" y1="20%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="55%" stopColor="#40AFFF" />
          <stop offset="100%" stopColor="#1665FF" />
        </linearGradient>
        <filter id="unpro-house-glow" x="-35%" y="-45%" width="170%" height="190%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="unpro-house-halo">
          <stop offset="0%" stopColor="#095BAA" stopOpacity=".28" />
          <stop offset="100%" stopColor="#095BAA" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="360" cy="237" rx="337" ry="167" fill="url(#unpro-house-halo)" />
      <path d="M35 339 Q360 378 686 339" fill="none" stroke="#0E67C7" strokeWidth="2" opacity=".55" />
      <path d="M78 233 C60 137 212 87 360 97 C523 108 665 144 648 239"
        fill="none" stroke="#0685DE" strokeWidth="1.8" opacity=".7" strokeDasharray="4 9" />

      {/* House silhouette */}
      <g fill="none" stroke="url(#unpro-house-line)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#unpro-house-glow)">
        <path d="M132 262 L326 139 L459 220 L525 182 L631 257" />
        <path d="M166 242 V343 H590 V253" />
        <path d="M326 139 L357 159 L357 198" />
        <path d="M459 220 L525 182" />
        <path d="M357 198 L459 220" />
        <path d="M132 262 L166 262 L326 165 L457 246 L525 209 L631 270" opacity=".7" />
        <path d="M196 243 V207 H219 V228" />
        <rect x="263" y="257" width="69" height="58" rx="1" />
        <path d="M297.5 257 V315 M263 286 H332" />
        <rect x="370" y="258" width="45" height="85" rx="1" />
        <circle cx="406" cy="300" r="2" fill="#31A9FF" stroke="none" />
        <rect x="475" y="278" width="93" height="65" rx="1" />
        <path d="M475 291 H568" opacity=".55" />
        <path d="M166 343 H615" />
        <path d="M201 338 C187 318 170 323 159 337 C146 318 123 324 120 341" opacity=".65" />
      </g>
      {/* Warm window interiors, subtle contrast */}
      <path d="M374 265 H411 V321 H374 Z" fill="#0B48A3" opacity=".25" />
      <path d="M271 265 H324 V308 H271 Z" fill="#0A74CE" opacity=".12" />

      {/* Four trade symbols in clear floating frames */}
      <g stroke="#32C7FF" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <rect x="71" y="147" width="85" height="75" rx="18" />
        <path d="M95 173 l16 -12 l9 11 l-14 10 M119 174 l18 22 M129 187 l-9 9" />
        <rect x="216" y="65" width="85" height="75" rx="18" />
        <path d="M237 86 h39 v15 h-39 z M257 102 v21 M250 124 h14" />
        <rect x="427" y="61" width="85" height="75" rx="18" />
        <path d="M469 82 c-13 17 -16 24 -16 31 a16 16 0 0 0 32 0 c0-7-4-14-16-31Z" />
        <rect x="565" y="138" width="85" height="75" rx="18" />
        <circle cx="606" cy="175" r="17" />
        <path d="M606 151 v48 M582 175 h48 M589 158 l34 34 M623 158 l-34 34" opacity=".75" />
      </g>
      <g fill="#6EDCFF">
        <path d="M534 91 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4Z" />
        <circle cx="548" cy="126" r="2.6" />
        <circle cx="194" cy="146" r="2.3" />
      </g>
    </svg>
  );
}

export default function HeroV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { lang, setLang } = useLanguage();
  const fr = lang === "fr";

  const openActivation = () => {
    onTrackCta("hero_primary_entry350", "hero");
    navigate(campaignLink("/entrepreneurs/activation-350", search, { activate: "1" }));
  };
  const openAudit = () => {
    onTrackCta("hero_secondary_plan_ia", "hero");
    navigate(campaignLink("/entrepreneurs/audit-ia", search));
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#020817] px-4 pb-10 pt-5 text-white sm:px-6 sm:pb-16 sm:pt-7">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-[#0945a5]/20 blur-[100px]" />
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex min-h-12 items-center justify-between gap-2 sm:mb-14">
          <UnproLogo size={110} variant="primary" animated={false} />
          <LanguageToggle lang={lang} onChange={setLang} className="shrink-0" />
          <button
            type="button"
            className="min-h-11 rounded-lg px-1 text-xs font-semibold text-white/90 transition-colors hover:text-[#42c8ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#42c8ff] sm:text-sm"
            onClick={() => {
              onTrackCta("topbar_login", "hero");
              navigate("/auth");
            }}
          >
            {fr ? "Connexion" : "Sign in"} <span aria-hidden="true">→</span>
          </button>
        </header>

        <div className="grid items-center gap-2 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-[580px] lg:mx-0">
            <h1 className="font-display text-[clamp(2rem,7.8vw,4.4rem)] font-extrabold leading-[1.08] tracking-[-.035em]">
              {fr ? "Plus de visibilité." : "More visibility."}
              <span className="mt-1 block bg-gradient-to-r from-[#45dafa] via-[#1689ff] to-[#69bfff] bg-clip-text text-transparent">
                {fr ? "Les bons projets." : "Better-fit projects."}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
              {fr
                ? "Présentez votre entreprise à Clara. Elle aide les bons clients à vous découvrir."
                : "Tell Clara about your business. Help the right homeowners discover you."}
            </p>
            <div className="hidden lg:block">
              <p className="mt-6 text-xs tracking-wide text-[#90c8ed]">
                {fr ? "Rénovation · Construction · Entretien · Services" : "Renovation · Construction · Maintenance · Services"}
              </p>
              <button
                type="button"
                onClick={openActivation}
                className="mt-6 flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0758f7] to-[#0868ff] px-5 py-3 text-base font-bold text-white shadow-[0_10px_35px_rgba(0,99,255,.28)] transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d7ff]"
              >
                {fr ? "Créer mon profil UNPRO" : "Create my UNPRO profile"} <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[580px] py-0 lg:py-6">
            <HouseLineArt fr={fr} />
          </div>
        </div>

        <div className="mx-auto max-w-md lg:hidden">
          <button
            type="button"
            onClick={openActivation}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0758f7] to-[#0868ff] px-3 py-3 text-sm font-bold text-white shadow-[0_10px_35px_rgba(0,99,255,.28)] transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d7ff] sm:text-base"
          >
            {fr ? "Créer mon profil UNPRO" : "Create my UNPRO profile"} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
          <p className="mt-5 text-center text-xs tracking-wide text-[#90c8ed]">
            {fr ? "Rénovation · Construction · Entretien · Services" : "Renovation · Construction · Maintenance · Services"}
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-white/60 lg:mt-9">
          {fr
            ? "Profil et 12 mois de présence IA UNPRO : 350 $ + taxes. Aucun rendez-vous inclus par défaut."
            : "UNPRO profile and 12 months of AI presence: CAD $350 + tax. No appointments included by default."}
        </p>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={openAudit}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-[#69d1ff] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64d7ff]"
          >
            {fr ? "Faire mon audit IA gratuit" : "Get my free AI audit"}
          </button>
        </div>
      </div>
    </section>
  );
}
