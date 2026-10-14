import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Handshake, Link2, Wallet } from "lucide-react";
import SeoHead from "@/seo/components/SeoHead";
import { Button } from "@/components/ui/button";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { trackAffiliateFunnel } from "@/features/affiliate/onboarding/trackAffiliateFunnel";

const steps = [
  { icon: Handshake, title: "Devenez affilié", text: "Rejoignez le programme avec votre compte existant. Votre taux et vos conditions sont confirmés dans votre espace affilié." },
  { icon: Link2, title: "Référez vos partenaires", text: "Plombier, électricien, couvreur, équipe d’entretien… Partagez votre lien personnel aux entrepreneurs de votre réseau." },
  { icon: Wallet, title: "Recevez vos commissions", text: "Lorsqu’une référence devient un client payant admissible, suivez votre commission et son statut dans votre espace." },
];
export default function PageContractorAffiliation() {
  const { search } = useLocation();
  useEffect(() => { void trackAffiliateFunnel("affiliate_landing_view", { metadata: { source: "contractor_affiliation" } }); }, []);
  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <SeoHead title="Votre réseau pourrait payer votre forfait | UNPRO" description="Devenez affilié UNPRO. Les commissions sur vos références peuvent couvrir le coût de votre forfait et même le dépasser." />
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-amber-500/10">
        <div className="relative mx-auto max-w-4xl px-5 py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Par ici les p’tits vites!</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Votre réseau pourrait payer votre forfait.</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">Référez vos partenaires à UNPRO. Vos commissions peuvent couvrir le coût de votre forfait — et même vous rapporter davantage.</p>
          <Button asChild size="lg" className="mt-8 min-h-12 whitespace-normal h-auto py-3"><Link to={campaignLink("/affilies/onboarding", search, { source: "contractor_affiliation" })} onClick={() => void trackAffiliateFunnel("affiliate_start_clicked", { metadata: { source: "contractor_affiliation" } })}>Devenir affilié <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Link to="/affiliate" className="mt-4 block w-fit py-2 text-sm underline underline-offset-4">Déjà affilié? Ouvrir mon espace</Link>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-5 py-10 space-y-10">
        <section className="grid gap-4 md:grid-cols-3" aria-label="Comment ça fonctionne">
          {steps.map(({ icon: Icon, title, text }, i) => <article key={title} className="rounded-3xl border border-border bg-card p-6"><Icon className="h-6 w-6 text-primary" /><h2 className="mt-5 text-lg font-semibold">{i + 1}. {title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}
        </section>
        <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-9">
          <h2 className="text-2xl font-semibold">Un coût net de 0 $? C’est possible.</h2>
          <p className="mt-4 text-muted-foreground">Si vos commissions admissibles couvrent le coût de votre forfait, celui-ci vous revient à 0 $ net. Si elles le dépassent, la différence représente un revenu supplémentaire.</p>
          <p className="mt-4 font-medium">Vos frais UNPRO − vos commissions = votre coût net.</p>
          <p className="mt-3 text-sm text-muted-foreground">Comparez les montants sur une même période. Une commission ponctuelle ne paie pas automatiquement tous les mois suivants. Les frais d’activation uniques sont distincts des frais mensuels.</p>
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Ce qu’il faut savoir</h2>
          <p className="text-muted-foreground">Votre forfait reste facturé normalement. Les commissions sont distinctes : il ne s’agit pas d’une remise automatique sur votre facture.</p>
          <p className="text-muted-foreground">Le nombre de références nécessaires dépend de votre forfait, de votre taux et des achats admissibles de vos partenaires. Les commissions ne sont ni fixes ni garanties.</p>
          <p className="text-muted-foreground">Consultez les conditions du programme et votre espace affilié pour les règles d’attribution, de validation et de versement. Une inscription seule ne garantit pas une commission.</p>
          <Link to={campaignLink("/affilies", search)} className="inline-block py-3 font-semibold text-primary underline underline-offset-4">Découvrir le programme affilié →</Link>
        </section>
      </div>
    </main>
  );
}
