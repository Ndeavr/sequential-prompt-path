/**
 * /plus-de-contrats (FR) et /en/more-contracts (EN).
 * Le CTA réutilise l'entrée entrepreneur canonique (attribution conservée,
 * source=facebook_public_requests); prix et RDV viennent du parcours existant.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import SeoHead from "@/seo/components/SeoHead";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { buildContractorEntryUrl } from "@/config/contractorFunnel";
import "../entrepreneur/thermopompes.css";
import "./plusDeContrats.css";

type Lang = "fr" | "en";
export const PDC_FR_PATH = "/plus-de-contrats";
export const PDC_EN_PATH = "/en/more-contracts";
export const PDC_SOURCE = "facebook_public_requests";

const C = {
  fr: {
    title: "Plus de contrats, moins de soumissions perdues | UNPRO",
    description: "Un seul projet attire des dizaines d’entrepreneurs dans les groupes publics. Avec Clara, les clients compatibles viennent à vous. Profil + 12 mois de présence IA : 350 $ + taxes.",
    other: "English", illus: "Illustration fictive", group: "Rénovation résidentielle",
    post: "Bonjour! On cherche quelqu’un pour refaire notre salle de bain au complet. Des recommandations?",
    comments: ["Je peux passer cette semaine!", "Envoyez-moi un message privé 👍", "On fait ça depuis 15 ans, MP", "Disponible pour une soumission", "Je vous texte mon numéro", "Regardez notre page!", "Moi aussi je suis dispo", "Prix compétitifs, écrivez-moi"],
    countLabel: "commentaires", pause: "Mettre l’animation en pause", play: "Reprendre l’animation",
    h1a: "Un seul projet. Des dizaines d’entrepreneurs.", h1b: "Et si les clients venaient à vous?",
    lead: "Clara qualifie le projet du propriétaire, trouve l’entrepreneur le plus compatible et prépare le rendez-vous.",
    cta: "Parler à Clara", vsTitle: "Deux façons de trouver des projets",
    pubT: "Demandes publiques", pub: ["Des dizaines de réponses pour un même projet", "Course au prix le plus bas", "Peu d’information sur le besoin réel", "Temps perdu en soumissions"],
    claT: "Avec Clara", cla: ["Besoin, budget et échéancier qualifiés", "Jumelage selon métier, territoire, capacité et façon de travailler", "Rendez-vous exclusifs, jamais partagés, selon votre offre", "Profil clair, lisible par les assistants IA"],
    offerT: "Activer mon profil", price: "350 $", priceSub: "+ taxes · paiement unique",
    offer: "Profil UNPRO + 12 mois de présence IA UNPRO. Paiement unique · sans abonnement automatique · taxes en sus.",
    rdv: "Les rendez-vous ne sont pas inclus par défaut. Si vous en voulez, la quantité, le prix et les conditions sont affichés avant tout paiement. Aucune garantie de contrats.",
    fine: "La publication et les commentaires ci-dessus sont fictifs, à titre d’illustration.",
  },
  en: {
    title: "More contracts, fewer lost quotes | UNPRO",
    description: "One project draws dozens of contractors in public groups. With Clara, compatible clients come to you. Profile + 12 months of AI presence: $350 + taxes.",
    other: "Français", illus: "Fictional illustration", group: "Home renovation",
    post: "Hi! We’re looking for someone to redo our whole bathroom. Any recommendations?",
    comments: ["I can come by this week!", "Send me a DM 👍", "15 years doing this, DM me", "Available for a quote", "Texting you my number", "Check out our page!", "Me too, available", "Competitive prices, message me"],
    countLabel: "comments", pause: "Pause animation", play: "Resume animation",
    h1a: "One project. Dozens of contractors.", h1b: "What if clients came to you?",
    lead: "Clara qualifies the homeowner’s project, finds the most compatible contractor and prepares the appointment.",
    cta: "Talk to Clara", vsTitle: "Two ways to find projects",
    pubT: "Public requests", pub: ["Dozens of replies for the same project", "Race to the lowest price", "Little information on the real need", "Time lost on quotes"],
    claT: "With Clara", cla: ["Need, budget and timeline qualified", "Matched on trade, territory, capacity and work style", "Exclusive appointments, never shared, per your offer", "Clear profile, readable by AI assistants"],
    offerT: "Activate my profile", price: "$350", priceSub: "+ taxes · one-time payment",
    offer: "UNPRO profile + 12 months of UNPRO AI presence. One-time payment · no automatic subscription · taxes extra.",
    rdv: "Appointments are not included by default. If you want them, quantity, price and terms are shown before any payment. No contract guarantee.",
    fine: "The post and comments above are fictional, for illustration only.",
  },
} as const;

function useReducedMotion() {
  const [r, setR] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)"); if (!m) return;
    const f = () => setR(m.matches); m.addEventListener?.("change", f); return () => m.removeEventListener?.("change", f);
  }, []);
  return r;
}

export default function PagePlusDeContrats({ lang = "fr" }: { lang?: Lang }) {
  const c = C[lang]; const fr = lang === "fr";
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [shown, setShown] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const total = c.comments.length;
  const visible = reduced ? total : shown;
  const href = buildContractorEntryUrl({ source: PDC_SOURCE, utm_source: undefined });

  useEffect(() => { void logFunnelEvent({ event_type: "pdc_page_view", metadata: { lang, source: PDC_SOURCE } }); }, [lang]);
  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => setShown(n => (n >= total ? 0 : n + 1)), 800);
    return () => window.clearInterval(id);
  }, [reduced, paused, total]);
  useEffect(() => { const el = listRef.current; if (el && !reduced) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [visible, reduced]);

  const track = (position: string) => void logFunnelEvent({ event_type: "pdc_cta_clicked", metadata: { position, lang, source: PDC_SOURCE } });
  const Cta = ({ position }: { position: string }) => (
    <Link className="utp-button" to={href} onClick={() => track(position)}>{c.cta} <ArrowRight size={18} aria-hidden /></Link>
  );

  return (
    <div className="utp pdc">
      <SeoHead title={c.title} description={c.description} canonical={`https://unpro.ca${fr ? PDC_FR_PATH : PDC_EN_PATH}`}
        frenchCanonical={`https://unpro.ca${PDC_FR_PATH}`} englishCanonical={`https://unpro.ca${PDC_EN_PATH}`} lang={fr ? "fr-CA" : "en-CA"} />
      <header className="utp-header">
        <Link to="/" aria-label="UNPRO"><UnproLogo size={120} tone="dark" /></Link>
        <Link className="utp-link" to={buildContractorEntryUrl({}, fr ? PDC_EN_PATH : PDC_FR_PATH)} hrefLang={fr ? "en-CA" : "fr-CA"}>{c.other}</Link>
      </header>
      <main>
        <section className="utp-wrap utp-section pdc-hero">
          <div>
            <h1>{c.h1a} <span>{c.h1b}</span></h1>
            <p className="utp-lead">{c.lead}</p>
            <div className="utp-actions"><Cta position="hero" /></div>
          </div>
          <figure className="pdc-phone" aria-label={c.illus}>
            <div className="pdc-screen">
              <div className="pdc-tag">{c.illus}</div>
              <div className="pdc-post"><b>{c.group}</b><p>{c.post}</p><div className="pdc-bath" aria-hidden>🛁</div></div>
              <div className="pdc-count" aria-live="polite"><strong>{visible}</strong> {c.countLabel}</div>
              <div className="pdc-list" ref={listRef}>
                {c.comments.slice(0, visible).map((t, i) => <div key={i} className="pdc-comment"><i aria-hidden />{t}</div>)}
              </div>
              {!reduced && (
                <button type="button" className="pdc-pause" onClick={() => setPaused(p => !p)} aria-label={paused ? c.play : c.pause}>
                  {paused ? <Play size={16} /> : <Pause size={16} />}
                </button>
              )}
            </div>
          </figure>
        </section>

        <section className="utp-wrap utp-section" aria-labelledby="pdc-vs">
          <h2 id="pdc-vs">{c.vsTitle}</h2>
          <div className="pdc-vs">
            <article className="pdc-card"><h3>{c.pubT}</h3><ul>{c.pub.map(t => <li key={t}>— {t}</li>)}</ul></article>
            <article className="pdc-card is-clara"><h3>{c.claT}</h3><ul>{c.cla.map(t => <li key={t}>✓ {t}</li>)}</ul></article>
          </div>
        </section>

        <section className="utp-wrap utp-section">
          <div className="utp-offer">
            <div><h2>{c.offerT}</h2><p>{c.offer}</p><p>{c.rdv}</p></div>
            <div className="utp-price"><strong>{c.price}</strong><small>{c.priceSub}</small><div className="utp-actions"><Cta position="offer" /></div></div>
          </div>
          <p className="utp-fine pdc-fine">{c.fine}</p>
        </section>
      </main>
    </div>
  );
}
