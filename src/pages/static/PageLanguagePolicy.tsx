import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/components/ui/LanguageToggle";
import LegalFooterBar from "@/components/legal/LegalFooterBar";

const OQLF_URL =
  "https://www.oqlf.gouv.qc.ca/francisation/droits_linguistiques/droits/langue-du-commerce-et-des-affaires.html";

const C = {
  fr: {
    title: "Politique linguistique — Loi 96",
    back: "Retour à l'accueil",
    intro: "UNPRO est une entreprise québécoise. Le français est la langue de nos services et de nos communications.",
    sections: [
      { h: "Service en français", b: "Vous pouvez obtenir l'ensemble de nos services en français : site, Clara, soutien et communications." },
      { h: "Site et documents", b: "Notre site est offert en français dans une version complète. Lorsqu'une version anglaise est offerte, la version française est d'une qualité au moins équivalente. Nos documents (conditions, confirmations, factures) sont disponibles en français." },
      { h: "Autre loi distincte", b: "La Loi 96 concerne la langue française. La protection de vos renseignements personnels relève de la Loi 25 et est décrite dans notre politique de confidentialité." },
      { h: "Signaler un problème", b: "Si un contenu n'est pas disponible en français, écrivez-nous à support@unpro.ca." },
    ],
    privacy: "Politique de confidentialité",
    oqlf: "Vos droits linguistiques (Office québécois de la langue française)",
  },
  en: {
    title: "Language policy — Bill 96",
    back: "Back to home",
    intro: "UNPRO is a Québec business. French is the language of our services and communications.",
    sections: [
      { h: "Service in French", b: "All our services are available in French: website, Clara, support and communications." },
      { h: "Website and documents", b: "Our website is offered in a complete French version. Where an English version is offered, the French version is of at least equivalent quality. Our documents (terms, confirmations, invoices) are available in French." },
      { h: "A separate law", b: "Bill 96 concerns the French language. Protection of your personal information falls under Law 25 and is described in our privacy policy." },
      { h: "Report an issue", b: "If any content is not available in French, write to support@unpro.ca." },
    ],
    privacy: "Privacy policy",
    oqlf: "Your language rights (Office québécois de la langue française, in French)",
  },
};

export default function PageLanguagePolicy() {
  const { lang } = useLanguage();
  const t = lang === "en" ? C.en : C.fr;
  useEffect(() => {
    document.title = `${t.title} — UNPRO`;
  }, [t.title]);

  return (
    <>
      <main lang={lang === "en" ? "en" : "fr"} className="landing-warm min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-10 md:py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">{t.title}</h1>
          <p className="text-lg text-foreground/80 leading-relaxed mb-10">{t.intro}</p>
          <div className="space-y-8">
            {t.sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-xl font-semibold text-foreground mb-2">{s.h}</h2>
                <p className="text-foreground/80 leading-relaxed">{s.b}</p>
              </section>
            ))}
          </div>
          <ul className="mt-10 space-y-3">
            <li><Link to="/confidentialite" className="text-primary underline underline-offset-2">{t.privacy}</Link></li>
            <li><a href={OQLF_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{t.oqlf}</a></li>
          </ul>
        </div>
      </main>
      <LegalFooterBar />
    </>
  );
}
