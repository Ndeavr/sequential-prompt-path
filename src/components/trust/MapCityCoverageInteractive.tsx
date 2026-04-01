/**
 * UNPRO — MapCityCoverageInteractive
 * Interactive Leaflet map showing city coverage.
 */
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CardCityServiceAvailability from "./CardCityServiceAvailability";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CityData {
  city: string;
  citySlug: string;
  service: string;
  contractorsCount: number;
  avgResponseTimeHours?: number;
  latitude: number;
  longitude: number;
}

interface Props {
  cities: CityData[];
}

export default function MapCityCoverageInteractive({ cities }: Props) {
  // Quebec center
  const center: [number, number] = [46.0, -73.0];

  // Deduplicate by city for markers
  const uniqueCities = cities.reduce<Record<string, CityData & { services: CityData[] }>>(
    (acc, c) => {
      if (!acc[c.citySlug]) {
        acc[c.citySlug] = { ...c, services: [] };
      }
      acc[c.citySlug].services.push(c);
      return acc;
    },
    {},
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 h-[400px] md:h-[500px]">
      <MapContainer
        center={center}
        zoom={7}
        className="h-full w-full"
        style={{ background: "hsl(var(--background))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {Object.values(uniqueCities).map((city) => (
          <Marker key={city.citySlug} position={[city.latitude, city.longitude]}>
            <Popup>
              <div className="space-y-2 min-w-[200px]">
                <h3 className="font-bold text-sm">{city.city}</h3>
                <p className="text-xs text-gray-600">
                  {city.services.length} service{city.services.length > 1 ? "s" : ""} ·{" "}
                  {city.services.reduce((sum, s) => sum + s.contractorsCount, 0)} entrepreneurs
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
