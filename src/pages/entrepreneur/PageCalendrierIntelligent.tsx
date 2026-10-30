/**
 * « Le calendrier intelligent UNPRO » — explainer page (contractors).
 * The interactive part is a LOCAL illustrative simulation: no network, no booking, no calendar write.
 * Real capabilities linked: /calendar/connect (Google busy-time sharing, Apple send-only subscription).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import UnproLogo from "@/components/brand/UnproLogo";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { nextAvailableSlot, formatHour } from "@/lib/smartCalendarDemo";

const T = {
  fr: {
    title: "Le calendrier intelligent UNPRO",
    desc: "Découvrez le calendrier intelligent UNPRO : une démonstration animée pour organiser disponibilités, déplacements et rendez-vous.",
    tagline: "Votre temps compte",
    navDemo: "Voir la démo", navAct: "L’activation ↗",
    h1a: "Votre métier.", h1b: "Votre horaire.", h1c: "Moins de casse-tête.",
    lead: "Un rendez-vous doit trouver sa place dans votre journée. Avec le temps de travailler, de vous déplacer et de souffler entre les deux.",
    seeDemo: "Voir le calendrier en action ↓", inAct: "L’activation",
    note: "Présentation interactive · données de démonstration",
    week: "Une semaine qui respire.", live: "Démo animée",
    ev: [["Visite client", "9 h · Laval"], ["Évaluation", "11 h · Terrebonne"], ["Temps réservé", "Votre agenda"], ["Créneau libre", "À votre rythme"], ["Rencontre projet", "9 h · Rive-Nord"], ["Suivi client", "14 h · À distance"]],
    days: [["LUN", "02"], ["MAR", "03"], ["MER", "04"]], travel: "↳ Déplacement",
    notifT: "✓ Une place pour chaque rendez-vous", notif: "Vos occupations et vos marges de déplacement comptent.",
    strip: ["Vos disponibilités", "Du temps entre les visites", "Vous gardez le contrôle"],
    pause: "Mettre les animations en pause", resume: "Reprendre les animations",
    tryTag: "Essayez le principe", tryH: "Un agenda rempli. Une journée encore possible.",
    tryP: "Changez la durée d’une visite et le temps de déplacement. La prochaine disponibilité se recalcule devant vous.",
    rules: "Votre matinée, vos règles.", dur: "Durée d’une visite", buf: "Temps entre les visites",
    addBusy: "Ajouter une occupation à 11 h", rmBusy: "Retirer l’occupation à 11 h",
    sim: "Démonstration illustrative. Aucun agenda connecté et aucun rendez-vous réellement réservé.",
    first: "Première visite · Laval", until: "Jusqu’à", gap: "min pour vous déplacer",
    personal: "Occupation personnelle", personalS: "11 h à 12 h · temps protégé",
    next: "Prochaine visite possible", to: "à",
    stOk: "Une disponibilité qui tient compte de votre journée.", stMoved: "Votre occupation est protégée. La visite est proposée après, avec votre marge.",
    fTag: "L’intelligence, c’est aussi le bon sens", fH: "Votre calendrier travaille selon vos règles.",
    f: [["01 / CONNECTER", "Un horaire cohérent.", "Connectez Google Agenda pour partager vos plages occupées, ou abonnez votre agenda Apple aux rendez-vous UNPRO."], ["02 / ORGANISER", "Des visites bien espacées.", "Le principe : respecter la durée de vos rencontres et les marges entre deux visites. Vous choisissez le rythme."], ["03 / DÉVELOPPER", "De la place pour vos objectifs.", "Votre profil est complété? Clara vous aide à préciser les projets recherchés, votre territoire et votre capacité."]],
    oTag: "Votre point de départ", oH: "Plus qu’un profil. Un outil au quotidien.",
    oSub: "Activation unique · profil professionnel et 12 mois de présence sur UNPRO",
    ctaAct: "Découvrir mon activation", ctaCal: "Connecter mon agenda",
    oList: ["Votre profil professionnel UNPRO", "12 mois de présence sur UNPRO", "Connexion de votre agenda (Google : plages occupées · Apple : abonnement)", "Calendrier intelligent : en développement"],
    oFine: "Aucun rendez-vous n’est inclus par défaut. Toute quantité de rendez-vous, s’il y a lieu, est indiquée clairement avant le paiement. Les fonctions du calendrier intelligent présentées ici sont en développement.",
    transition: "Votre profil est complété. Maintenant, passons aux choses sérieuses : qu’aimeriez-vous accomplir avec votre entreprise au cours des 12 prochains mois?",
    clara: "En parler avec Clara",
    qTag: "Tout simplement", qH: "Les bonnes questions.",
    q: [["Est-ce que je garde mon agenda habituel?", "Oui. Google Agenda partage seulement vos plages occupées avec UNPRO; Apple reçoit un abonnement en lecture des rendez-vous UNPRO. Votre agenda reste le vôtre."], ["Le 350 $ inclut-il des clients garantis?", "Non. L’accès au calendrier ne constitue pas une garantie de clients. Aucun rendez-vous n’est inclus par défaut; toute quantité incluse est indiquée avant le paiement."], ["Est-ce que cette démonstration réserve un rendez-vous?", "Non. C’est une simulation interactive. Aucun renseignement n’est envoyé et aucune réservation n’est créée."]],
    foot: "Présentation de l’offre · Démonstration illustrative",
  },
  en: {
    title: "The UNPRO smart calendar",
    desc: "Discover the UNPRO smart calendar: an animated demo for organizing availability, travel and appointments.",
    tagline: "Your time matters",
    navDemo: "See the demo", navAct: "Activation ↗",
    h1a: "Your trade.", h1b: "Your schedule.", h1c: "Fewer headaches.",
    lead: "An appointment should fit into your day — with time to work, travel and breathe in between.",
    seeDemo: "See the calendar in action ↓", inAct: "Activation",
    note: "Interactive presentation · demo data",
    week: "A week that breathes.", live: "Animated demo",
    ev: [["Client visit", "9:00 · Laval"], ["Assessment", "11:00 · Terrebonne"], ["Reserved time", "Your calendar"], ["Open slot", "At your pace"], ["Project meeting", "9:00 · North Shore"], ["Client follow-up", "14:00 · Remote"]],
    days: [["MON", "02"], ["TUE", "03"], ["WED", "04"]], travel: "↳ Travel",
    notifT: "✓ A place for every appointment", notif: "Your commitments and travel buffers count.",
    strip: ["Your availability", "Time between visits", "You stay in control"],
    pause: "Pause animations", resume: "Resume animations",
    tryTag: "Try the principle", tryH: "A full calendar. A day that still works.",
    tryP: "Change the visit length and travel time. The next availability recalculates in front of you.",
    rules: "Your morning, your rules.", dur: "Visit length", buf: "Time between visits",
    addBusy: "Add a commitment at 11:00", rmBusy: "Remove the 11:00 commitment",
    sim: "Illustrative demo. No calendar connected and no appointment actually booked.",
    first: "First visit · Laval", until: "Until", gap: "min to travel",
    personal: "Personal commitment", personalS: "11:00 to 12:00 · protected time",
    next: "Next possible visit", to: "to",
    stOk: "An availability that respects your day.", stMoved: "Your commitment is protected. The visit is proposed afterwards, with your buffer.",
    fTag: "Smart also means common sense", fH: "Your calendar works by your rules.",
    f: [["01 / CONNECT", "A coherent schedule.", "Connect Google Calendar to share your busy times, or subscribe your Apple calendar to UNPRO appointments."], ["02 / ORGANIZE", "Well-spaced visits.", "The principle: respect your meeting length and the buffers between visits. You set the pace."], ["03 / GROW", "Room for your goals.", "Profile complete? Clara helps you clarify the projects you want, your territory and your capacity."]],
    oTag: "Your starting point", oH: "More than a profile. A daily tool.",
    oSub: "One-time activation · professional profile and 12 months of presence on UNPRO",
    ctaAct: "Discover my activation", ctaCal: "Connect my calendar",
    oList: ["Your UNPRO professional profile", "12 months of presence on UNPRO", "Calendar connection (Google: busy times · Apple: subscription)", "Smart calendar: in development"],
    oFine: "No appointments are included by default. Any appointment quantity, if applicable, is stated clearly before payment. Smart calendar features shown here are in development.",
    transition: "Your profile is complete. Now let’s get serious: what would you like to achieve with your business over the next 12 months?",
    clara: "Talk it through with Clara",
    qTag: "Simply put", qH: "The right questions.",
    q: [["Do I keep my usual calendar?", "Yes. Google Calendar only shares your busy times with UNPRO; Apple receives a read-only subscription to UNPRO appointments. Your calendar stays yours."], ["Does the $350 include guaranteed clients?", "No. Calendar access is not a guarantee of clients. No appointments are included by default; any included quantity is stated before payment."], ["Does this demo book an appointment?", "No. It’s an interactive simulation. No information is sent and no booking is created."]],
    foot: "Offer presentation · Illustrative demo",
  },
};

const CSS = `
.uci{--bg:#070d18;--line:#25374c;--blue:#46aeff;--muted:#a3b4c8;--green:#65e6ba;background:var(--bg);color:#f4f8ff;min-height:100vh;overflow-x:hidden}
.uci p{color:var(--muted)}
.uci .tag{color:var(--blue);font-size:12px;letter-spacing:.17em;text-transform:uppercase}
.uci .cal{background:linear-gradient(140deg,#172a41,#0d1726);border:1px solid #32465e;border-radius:20px;padding:20px;box-shadow:0 30px 100px #008cff15}
@media(min-width:900px){.uci .cal{transform:rotate(-2deg)}}
.uci .livedot:before{content:'';display:inline-block;width:7px;height:7px;background:var(--green);border-radius:50%;margin-right:6px;animation:uciPulse 2s infinite}
.uci .col{height:260px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 64px,#ffffff09 65px);border-left:1px solid #ffffff09;position:relative}
.uci .ev{position:absolute;left:4px;right:4px;border-radius:7px;padding:8px 6px;font-size:11px;line-height:1.4;background:#1a4365;border-left:2px solid var(--blue);animation:uciArrive 7s infinite}
.uci .ev b{display:block;color:#fff}
.uci .ev.g{background:#17413d;border-color:var(--green);animation-delay:.9s}
.uci .ev.p{background:#342d50;border-color:#b59aff;animation-delay:.4s}
.uci .notif{margin-top:16px;padding:14px;background:#eaf5ff;color:#112538;border-radius:12px;font-size:12px;box-shadow:0 10px 40px #0005;animation:uciFloat 5s infinite}
.uci .notif b{display:block;font-size:14px}
.uci .slot{background:#162d46;border:1px solid #2b5275;border-radius:9px;padding:14px;position:relative;transition:all .5s}
.uci .slot.new{border-color:var(--green);background:#153b36}
.uci .slot .t{position:absolute;left:-58px;top:16px;color:var(--muted);font-size:12px;width:52px}
.uci input[type=range]{width:100%;accent-color:var(--blue)}
.uci .cta{display:inline-flex;align-items:center;min-height:44px;background:var(--blue);color:#03101c;border-radius:12px;padding:12px 20px;font-weight:700}
.uci .ghost{display:inline-flex;align-items:center;min-height:44px;border:1px solid #416182;border-radius:12px;padding:12px 18px;color:#f4f8ff}
.uci :focus-visible{outline:3px solid var(--green);outline-offset:4px}
.uci.paused *{animation-play-state:paused!important}
@keyframes uciPulse{50%{opacity:.35}}@keyframes uciFloat{50%{transform:translateY(-7px)}}
@keyframes uciArrive{0%,8%{opacity:0;transform:translateY(12px)}20%,90%{opacity:1;transform:none}100%{opacity:0}}
@media(prefers-reduced-motion:reduce){.uci *{animation:none!important;transition:none!important}}
`;

export default function PageCalendrierIntelligent() {
  const { lang } = useLanguage();
  const t = T[lang] ?? T.fr;
  const { isAuthenticated, role } = useAuth();
  const isContractor = isAuthenticated && role === "contractor";
  const [duration, setDuration] = useState(60);
  const [buffer, setBuffer] = useState(30);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const s = nextAvailableSlot(duration, buffer, busy);
  const fh = (m: number) => formatHour(m, lang);
  const activationHref = "/entrepreneurs/activation-350?from=calendrier_intelligent";
  const calendarHref = "/calendar/connect?role=contractor&surface=calendrier_intelligent";

  const EvTops = [[20, 147], [70, 185], [20, 165]];

  return (
    <div className={`uci${paused ? " paused" : ""}`}>
      <Helmet>
        <html lang={lang === "fr" ? "fr-CA" : "en-CA"} />
        <title>{t.title}</title>
        <meta name="description" content={t.desc} />
        <link rel="canonical" href="https://unpro.ca/calendrier-intelligent" />
      </Helmet>
      <style>{CSS}</style>

      <header className="mx-auto flex h-[75px] max-w-6xl items-center justify-between border-b px-5 md:h-[95px] md:px-8" style={{ borderColor: "var(--line)" }}>
        <Link to="/" aria-label="UNPRO" className="flex items-center gap-4">
          <UnproLogo size={110} tone="dark" />
          <span className="hidden text-[11px] uppercase tracking-[.15em] md:inline" style={{ color: "var(--muted)" }}>{t.tagline}</span>
        </Link>
        <nav className="flex gap-4 text-[13px]">
          <a href="#demo" className="hidden sm:inline">{t.navDemo}</a>
          <a href="#activation">{t.navAct}</a>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid items-center gap-10 py-12 md:grid-cols-2 md:gap-12 md:py-20">
          <div>
            <span className="tag">{t.title}</span>
            <h1 className="my-5 text-[42px] font-bold leading-[1.07] tracking-[-.055em] md:text-[64px]">
              {t.h1a}<br />{t.h1b}<br /><em className="not-italic" style={{ color: "var(--blue)" }}>{t.h1c}</em>
            </h1>
            <p className="max-w-[480px] text-lg">{t.lead}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a className="cta" href="#demo">{t.seeDemo}</a>
              <a className="ghost" href="#activation">{t.inAct}</a>
            </div>
            <p className="mt-5 text-xs">{t.note}</p>
          </div>
          <div className="cal" aria-label={t.week}>
            <div className="flex items-center justify-between"><strong>{t.week}</strong><span className="livedot text-[11px]" style={{ color: "var(--green)" }}>{t.live}</span></div>
            <div className="mt-6 grid grid-cols-3 gap-2" aria-hidden>
              {t.days.map(([d, n], i) => (
                <div key={d}>
                  <div className="pb-3 text-center text-[11px]" style={{ color: "var(--muted)" }}>{d}<b className="block text-[22px] text-[#fff]">{n}</b></div>
                  <div className="col">
                    <div className={`ev${i === 1 ? " p" : ""}`} style={{ top: EvTops[i][0] }}><b>{t.ev[i * 2][0]}</b>{t.ev[i * 2][1]}</div>
                    {i === 0 && <div className="absolute left-2 top-[118px] text-[9px]" style={{ color: "#8195ad" }}>{t.travel}</div>}
                    <div className={`ev ${i === 2 ? "p" : "g"}`} style={{ top: EvTops[i][1] }}><b>{t.ev[i * 2 + 1][0]}</b>{t.ev[i * 2 + 1][1]}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="notif"><b>{t.notifT}</b>{t.notif}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-y py-6 text-[13px] md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
          {t.strip.map((x) => <span key={x}><span style={{ color: "var(--blue)" }} className="mr-3">✓</span>{x}</span>)}
          <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} className="self-start rounded-md border px-3 py-2 text-xs" style={{ borderColor: "var(--line)" }}>
            {paused ? t.resume : t.pause}
          </button>
        </div>

        <section id="demo" className="py-14 md:py-20">
          <span className="tag">{t.tryTag}</span>
          <h2 className="my-4 max-w-xl text-[30px] font-bold leading-tight tracking-[-.04em] md:text-[44px]">{t.tryH}</h2>
          <p className="max-w-[660px]">{t.tryP}</p>
          <div className="mt-8 grid gap-8 rounded-[18px] border p-6 md:grid-cols-[.8fr_1.2fr] md:gap-14 md:p-9" style={{ borderColor: "var(--line)", background: "#0d1725" }}>
            <div>
              <strong>{t.rules}</strong>
              <label htmlFor="uci-duration" className="mb-2 mt-6 block">{t.dur} <b data-testid="duration-value">{duration} min</b></label>
              <input id="uci-duration" type="range" min={30} max={90} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              <label htmlFor="uci-buffer" className="mb-2 mt-6 block">{t.buf} <b data-testid="buffer-value">{buffer} min</b></label>
              <input id="uci-buffer" type="range" min={15} max={60} step={15} value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} />
              <button type="button" onClick={() => setBusy((b) => !b)} aria-pressed={busy} className="mt-6 min-h-11 rounded-lg border px-4 py-2" style={{ borderColor: busy ? "var(--green)" : "#416182", color: busy ? "var(--green)" : "#fff", background: "#182b40" }}>
                {busy ? t.rmBusy : t.addBusy}
              </button>
              <p className="mt-4 text-xs">{t.sim}</p>
            </div>
            <div className="space-y-3 pl-[58px]">
              <div className="slot"><span className="t">{fh(540)}</span><strong>{t.first}</strong><span className="block text-xs" style={{ color: "var(--muted)" }}>{t.until} {fh(s.firstEnd)}</span></div>
              <div className="text-xs" style={{ color: "var(--green)" }}>↳ {buffer} {t.gap}</div>
              {busy && <div className="slot" data-testid="busy-slot"><span className="t">{fh(660)}</span><strong>{t.personal}</strong><span className="block text-xs" style={{ color: "var(--muted)" }}>{t.personalS}</span></div>}
              <div className="slot new"><span className="t" data-testid="next-time">{fh(s.start)}</span><strong>{t.next}</strong><span className="block text-xs" style={{ color: "var(--muted)" }}>{fh(s.start)} {t.to} {fh(s.end)}</span></div>
              <p className="min-h-[45px] text-[13px]" style={{ color: "var(--green)" }} aria-live="polite">{s.moved ? t.stMoved : t.stOk}</p>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <span className="tag">{t.fTag}</span>
          <h2 className="my-4 text-[30px] font-bold leading-tight tracking-[-.04em] md:text-[44px]">{t.fH}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {t.f.map(([n, h, p]) => (
              <article key={n}><span className="block border-t pt-4 text-xs" style={{ color: "var(--blue)", borderColor: "var(--blue)" }}>{n}</span><h3 className="my-2 text-xl font-semibold">{h}</h3><p className="text-[15px]">{p}</p></article>
            ))}
          </div>
        </section>

        <section id="activation" className="py-14 md:py-20">
          <div className="grid gap-8 rounded-[20px] border p-6 md:grid-cols-[1.1fr_1fr] md:gap-16 md:p-11" style={{ borderColor: "#36536e", background: "radial-gradient(ellipse at top right,#163e66,transparent 70%),#101c2c" }}>
            <div>
              <span className="tag">{t.oTag}</span>
              <h2 className="my-4 text-[30px] font-bold leading-tight tracking-[-.04em] md:text-[40px]">{t.oH}</h2>
              <div className="text-[55px] font-bold leading-tight tracking-[-.05em] md:text-[64px]">350 $ <small className="text-base font-normal tracking-normal" style={{ color: "var(--muted)" }}>{lang === "fr" ? "+ taxes" : "+ tax"}</small></div>
              <p>{t.oSub}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="cta" to={activationHref} data-testid="uci-cta-activation">{t.ctaAct} ↗</Link>
                {isContractor && <Link className="ghost" to={calendarHref} data-testid="uci-cta-calendar">{t.ctaCal}</Link>}
              </div>
            </div>
            <div>
              <ul className="list-none p-0">
                {t.oList.map((x) => <li key={x} className="border-b py-3" style={{ borderColor: "#ffffff18" }}><span className="mr-3" style={{ color: "var(--blue)" }}>↗</span>{x}</li>)}
              </ul>
              <p className="mt-3 text-xs">{t.oFine}</p>
            </div>
          </div>
          <div className="mt-8 rounded-[20px] border p-6" style={{ borderColor: "var(--line)", background: "#0d1725" }}>
            <p className="text-base text-[#f4f8ff]">{t.transition}</p>
            <Link className="ghost mt-4" to="/entrepreneurs/activation-350?from=calendrier_intelligent">{t.clara}</Link>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <span className="tag">{t.qTag}</span>
          <h2 className="my-4 text-[30px] font-bold tracking-[-.04em] md:text-[44px]">{t.qH}</h2>
          {t.q.map(([q, a]) => (
            <details key={q} className="border-b py-5" style={{ borderColor: "var(--line)" }}><summary className="cursor-pointer text-lg">{q}</summary><p className="mt-2 max-w-[750px]">{a}</p></details>
          ))}
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 border-t px-5 pb-8 pt-6 text-xs md:px-8" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
        <span>UNPRO · {t.title}</span><span>{t.foot}</span><Link to="/">unpro.ca</Link>
      </footer>
    </div>
  );
}
