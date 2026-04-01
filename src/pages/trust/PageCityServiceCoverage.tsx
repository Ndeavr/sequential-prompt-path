/**
 * UNPRO — PageCityServiceCoverage
 * Interactive map + cards showing city/service coverage.
 */
import { Helmet } from "react-helmet-async";
import SectionContainer from "@/components/unpro/SectionContainer";
import MapCityCoverageInteractive from "@/components/trust/MapCityCoverageInteractive";
import CardCityServiceAvailability from "@/components/trust/CardCityServiceAvailability";
import { useCityServices } from "@/hooks/useTrustData";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { MapPin, Loader2 } from "lucide-react";

// Fallback data
const FALLBACK_CITIES = [
  { city: "Montréal", citySlug: "montreal", service: "Plomberie", serviceSlug: "plomberie", contractorsCount: 45, avgResponseTimeHours: 2, latitude: 45.5017, longitude: -73.5673, is_active: true, province: "QC" },
  { city: "Laval", citySlug: "laval", service: "Électricité", serviceSlug: "electricite", contractorsCount: 28, avgResponseTimeHours: 3, latitude: 45.6066, longitude: -73.7124, is_active: true, province: "QC" },
  { city: "Québec", citySlug: "quebec", service: "Toiture", serviceSlug: "toiture", contractorsCount: 22, avgResponseTimeHours: 4, latitude: 46.8139, longitude: -71.2080, is_active: true, province: "QC" },
  { city: "Longueuil", citySlug: "longueuil", service: "Chauffage", serviceSlug: "chauffage", contractorsCount: 18, avgResponseTimeHours: 3, latitude: 45.5312, longitude: -73.5185, is_active: true, province: "QC" },
  { city: "Gatineau", citySlug: "gatineau", service: "Plomberie", serviceSlug: "plomberie", contractorsCount: 15, avgResponseTimeHours: 4, latitude: 45.4765, longitude: -75.7013, is_active: true, province: "QC" },
  { city: "Sherbrooke", citySlug: "sherbrooke", service: "Électricité", serviceSlug: "electricite", contractorsCount: 12, avgResponseTimeHours: 5, latitude: 45.4042, longitude: -71.8929, is_active: true, province: "QC" },
];

export default function PageCityServiceCoverage() {
  const { data: cityServices, isLoading } = useCityServices();
  const displayData = cityServices && cityServices.length > 0 ? cityServices : FALLBACK_CITIES;

  const mapData = displayData
    .filter((c: any) => c.latitude && c.longitude)
    .map((c: any) => ({
      city: c.city,
      citySlug: c.city_slug ?? c.citySlug,
      service: c.service,
      contractorsCount: c.contractors_count ?? c.contractorsCount,
      avgResponseTimeHours: c.avg_response_time_hours ?? c.avgResponseTimeHours,
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    }));

  return (
    <>
      <Helmet>
        <title>Couverture par ville | UNPRO — Services résidentiels au Québec</title>
        <meta
          name="description"
          content="Découvrez les services résidentiels disponibles dans votre ville. Montréal, Laval, Québec, Longueuil et plus — entrepreneurs vérifiés et disponibles."
        />
      </Helmet>

      <main className="min-h-screen pb-20">
        <SectionContainer width="narrow" className="pt-20 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Couverture locale</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Partout au Québec
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Des entrepreneurs vérifiés dans votre ville, prêts à intervenir rapidement.
            </p>
          </motion.div>
        </SectionContainer>

        <SectionContainer>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MapCityCoverageInteractive cities={mapData} />
          )}
        </SectionContainer>

        <SectionContainer>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {displayData.map((c: any, i: number) => (
              <motion.div key={`${c.city_slug ?? c.citySlug}-${c.service_slug ?? c.serviceSlug}-${i}`} variants={fadeUp}>
                <CardCityServiceAvailability
                  city={c.city}
                  service={c.service}
                  contractorsCount={c.contractors_count ?? c.contractorsCount}
                  avgResponseTimeHours={c.avg_response_time_hours ?? c.avgResponseTimeHours}
                />
              </motion.div>
            ))}
          </motion.div>
        </SectionContainer>
      </main>
    </>
  );
}
