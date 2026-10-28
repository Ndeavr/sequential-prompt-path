/**
 * UNPRO — Page des forfaits propriétaires.
 * Les plans entrepreneurs sont exclusivement personnalisés et séparés.
 */
import { Helmet } from "react-helmet-async";
import HomeownerPlans from "./pricing/HomeownerPlans";
import PricingHeroHomeowners from "./pricing/PricingHeroHomeowners";

export default function PricingHomeownersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Forfaits propriétaires — UNPRO</title>
        <meta
          name="description"
          content="Comparez vos soumissions, vérifiez les entrepreneurs et organisez votre maison avec Clara. Découvrez les forfaits propriétaires UNPRO."
        />
        <link rel="canonical" href="https://unpro.ca/pricing/proprietaires" />
      </Helmet>

      <PricingHeroHomeowners />
      <HomeownerPlans />
    </div>
  );
}
