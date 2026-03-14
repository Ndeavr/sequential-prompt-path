/**
 * Public Property Map — Interactive Leaflet map with property markers,
 * renovation activity layer, and neighborhood intelligence.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Filter, Layers, X, ChevronRight, Shield, Sparkles,
  Wrench, Eye, Home, BadgeCheck, TrendingUp, Activity,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePropertyMap, MapMarker, RenovationActivity, NeighborhoodStat } from "@/hooks/usePropertyMap";
import { Helmet } from "react-helmet-async";

/* ── Marker Icons ── */
const createScoreIcon = (score: number | null, certified: boolean) => {
  const color = score === null ? "#94a3b8" : score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const ring = certified ? "stroke-width:3;stroke:#3b82f6;" : "";
  return L.divIcon({
    className: "property-marker",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;box-shadow:0 2px 8px ${color}60;border:2px solid white;${ring}">${score ?? "?"}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const renovationIcon = L.divIcon({
  className: "reno-marker",
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px #8b5cf660;border:2px solid white;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/* ── Map events component for viewport tracking ── */
const MapBoundsTracker = ({ onBoundsChange }: { onBoundsChange: (b: any) => void }) => {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
    zoomend: () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });
  return null;
};

const WORK_TYPES = [
  { value: "all", label: "Tous les types" },
  { value: "roof", label: "Toiture" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "insulation", label: "Isolation" },
  { value: "windows", label: "Fenêtres" },
  { value: "foundation", label: "Fondation" },
  { value: "hvac", label: "Chauffage/CVAC" },
  { value: "siding", label: "Revêtement" },
  { value: "kitchen", label: "Cuisine" },
  { value: "bathroom", label: "Salle de bain" },
];

const PropertyMapPage = () => {
  const {
    markers, renovations, neighborhoods,
    isLoading, filters, setFilters,
    showRenovations, setShowRenovations,
    renovationFilter, setRenovationFilter,
    updateBounds,
  } = usePropertyMap();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedReno, setSelectedReno] = useState<RenovationActivity | null>(null);
  const [showNeighborhood, setShowNeighborhood] = useState(false);

  // Québec default center
  const defaultCenter: [number, number] = [45.508, -73.587];
  const defaultZoom = 12;

  return (
    <>
      <Helmet>
        <title>Carte des propriétés — Scores et rénovations | UNPRO</title>
        <meta name="description" content="Explorez la carte interactive des propriétés avec scores, certifications et activité de rénovation dans votre quartier." />
      </Helmet>

      <div className="relative h-screen w-full overflow-hidden bg-background">
        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-2 pointer-events-none">
          <Link to="/" className="pointer-events-auto">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-card/90 backdrop-blur-xl shadow-lg border-border/40">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
          </Link>

          <div className="flex-1" />

          {/* Layer toggles */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <Button
              variant={showRenovations ? "default" : "outline"}
              size="sm"
              className="rounded-xl h-10 gap-1.5 bg-card/90 backdrop-blur-xl shadow-lg border-border/40 text-xs"
              onClick={() => setShowRenovations(!showRenovations)}
              style={showRenovations ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" } : {}}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rénovations</span>
            </Button>
            <Button
              variant={showNeighborhood ? "default" : "outline"}
              size="sm"
              className="rounded-xl h-10 gap-1.5 bg-card/90 backdrop-blur-xl shadow-lg border-border/40 text-xs"
              onClick={() => setShowNeighborhood(!showNeighborhood)}
              style={showNeighborhood ? { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" } : {}}
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quartier</span>
            </Button>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="rounded-xl h-10 gap-1.5 bg-card/90 backdrop-blur-xl shadow-lg border-border/40 text-xs"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtres</span>
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              className="absolute top-16 right-4 z-[1000] w-72"
            >
              <Card className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Filtres</h3>
                    <button onClick={() => setShowFilters(false)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Score range */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Score</label>
                    <Slider
                      defaultValue={[filters.scoreMin, filters.scoreMax]}
                      min={0} max={100} step={5}
                      onValueCommit={(v) => setFilters({ ...filters, scoreMin: v[0], scoreMax: v[1] })}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{filters.scoreMin}</span><span>{filters.scoreMax}</span>
                    </div>
                  </div>

                  {/* Toggle filters */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground flex items-center gap-1.5">
                        <BadgeCheck className="h-3 w-3 text-primary" /> Certifié
                      </span>
                      <Switch checked={filters.certified} onCheckedChange={(c) => setFilters({ ...filters, certified: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-success" /> Passeport actif
                      </span>
                      <Switch checked={filters.activePassport} onCheckedChange={(c) => setFilters({ ...filters, activePassport: c })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground flex items-center gap-1.5">
                        <Eye className="h-3 w-3 text-warning" /> Score estimé
                      </span>
                      <Switch checked={filters.estimated} onCheckedChange={(c) => setFilters({ ...filters, estimated: c })} />
                    </div>
                  </div>

                  {/* Renovation filter */}
                  {showRenovations && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Type de travaux</label>
                      <Select value={renovationFilter || "all"} onValueChange={(v) => setRenovationFilter(v === "all" ? null : v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WORK_TYPES.map(w => (
                            <SelectItem key={w.value} value={w.value} className="text-xs">{w.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Reset */}
                  <Button variant="ghost" size="sm" className="w-full text-xs"
                    onClick={() => setFilters({ scoreMin: 0, scoreMax: 100, certified: false, activePassport: false, estimated: false, workInProgress: false })}
                  >
                    Réinitialiser
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Neighborhood activity panel */}
        <AnimatePresence>
          {showNeighborhood && neighborhoods.length > 0 && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 z-[1000]"
            >
              <div className="overflow-x-auto scrollbar-none">
                <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
                  {neighborhoods.slice(0, 8).map((n) => (
                    <NeighborhoodCard key={n.id} stat={n} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected property preview */}
        <AnimatePresence>
          {selectedMarker && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 z-[1000] max-w-md mx-auto"
            >
              <PropertyPreviewCard marker={selectedMarker} onClose={() => setSelectedMarker(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected renovation preview */}
        <AnimatePresence>
          {selectedReno && !selectedMarker && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 z-[1000] max-w-md mx-auto"
            >
              <RenovationPreviewCard reno={selectedReno} onClose={() => setSelectedReno(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-[999] pointer-events-auto">
          <Card className="bg-card/90 backdrop-blur-xl border-border/40 shadow-lg">
            <CardContent className="p-2.5 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Légende</p>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
                <span className="text-foreground">80+ Excellent</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
                <span className="text-foreground">60-79 Correct</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                <span className="text-foreground">&lt;60 À améliorer</span>
              </div>
              {showRenovations && (
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#8b5cf6" }} />
                  <span className="text-foreground">Rénovation</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000]">
            <Badge className="bg-card/90 backdrop-blur-xl text-foreground border-border/40 animate-pulse">
              Chargement…
            </Badge>
          </div>
        )}

        {/* Marker count */}
        <div className="absolute top-16 left-4 z-[999]">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-xl border-border/40 text-[10px]">
            {markers.length} propriétés
            {showRenovations && renovations.length > 0 && ` · ${renovations.length} rénovations`}
          </Badge>
        </div>

        {/* The Leaflet Map */}
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className="h-full w-full"
          zoomControl={false}
          style={{ background: "hsl(var(--background))" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBoundsTracker onBoundsChange={updateBounds} />

          {/* Property markers */}
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={[m.latitude, m.longitude]}
              icon={createScoreIcon(m.estimated_score, m.certification_status === "certified")}
              eventHandlers={{
                click: () => { setSelectedMarker(m); setSelectedReno(null); },
              }}
            />
          ))}

          {/* Renovation markers */}
          {showRenovations && renovations.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={renovationIcon}
              eventHandlers={{
                click: () => { setSelectedReno(r); setSelectedMarker(null); },
              }}
            />
          ))}
        </MapContainer>
      </div>
    </>
  );
};

/* ── Property Preview Card ── */
const PropertyPreviewCard = ({ marker, onClose }: { marker: MapMarker; onClose: () => void }) => {
  const scoreColor = marker.estimated_score === null ? "text-muted-foreground" :
    marker.estimated_score >= 80 ? "text-success" :
    marker.estimated_score >= 60 ? "text-warning" : "text-destructive";

  return (
    <Card className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* Photo */}
          <div className="w-24 h-24 shrink-0 bg-muted/30">
            {marker.photo_url ? (
              <img src={marker.photo_url} alt="Property" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {marker.certification_status === "certified" && (
                    <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-foreground truncate">
                    {marker.property_type || "Propriété"}
                    {marker.city && ` — ${marker.city}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {marker.year_built && <span>Constr. {marker.year_built}</span>}
                  {marker.neighborhood && <span>· {marker.neighborhood}</span>}
                </div>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className={`text-xl font-display font-bold ${scoreColor}`}>
                  {marker.estimated_score ?? "—"}
                </span>
                <Badge variant="outline" className="text-[9px] h-5">
                  {marker.public_status === "active" ? "Actif" :
                   marker.public_status === "certified" ? "Certifié" : "Estimé"}
                </Badge>
              </div>
              {marker.slug && (
                <Link to={`/maison/${marker.slug}`}>
                  <Button size="sm" className="h-7 text-[10px] rounded-full gap-1"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                  >
                    Voir <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Renovation Preview Card ── */
const RenovationPreviewCard = ({ reno, onClose }: { reno: RenovationActivity; onClose: () => void }) => {
  const WORK_FR: Record<string, string> = {
    roof: "Toiture", plumbing: "Plomberie", electrical: "Électricité",
    insulation: "Isolation", windows: "Fenêtres", foundation: "Fondation",
    hvac: "Chauffage", siding: "Revêtement", kitchen: "Cuisine", bathroom: "Salle de bain",
  };

  return (
    <Card className="bg-card/95 backdrop-blur-xl border-border/40 shadow-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(252 100% 65% / 0.15)" }}>
              <Wrench className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {WORK_FR[reno.work_type] || reno.work_type}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {reno.city}{reno.neighborhood ? ` — ${reno.neighborhood}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/50">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant={reno.contribution_status === "approved" ? "default" : "secondary"} className="text-[10px]">
            {reno.contribution_status === "approved" ? "Complété" : "En cours"}
          </Badge>
          {reno.work_date && <span>{new Date(reno.work_date).toLocaleDateString("fr-CA")}</span>}
        </div>

        {reno.contractor_name && reno.contractor_slug && (
          <Link to={`/contractors/${reno.contractor_slug}`}
            className="mt-2 flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors"
          >
            <BadgeCheck className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-medium text-foreground">{reno.contractor_name}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

/* ── Neighborhood Activity Card ── */
const NeighborhoodCard = ({ stat }: { stat: NeighborhoodStat }) => {
  const topRenos = stat.top_renovation_types as string[] | null;

  return (
    <Card className="bg-card/95 backdrop-blur-xl border-border/40 shadow-lg w-56 shrink-0">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {stat.neighborhood || stat.city || stat.area_key}
            </p>
            <p className="text-[9px] text-muted-foreground">{stat.property_count || 0} propriétés</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-muted/30 p-1.5">
            <p className="text-xs font-bold text-foreground">{stat.avg_score ? Math.round(stat.avg_score) : "—"}</p>
            <p className="text-[8px] text-muted-foreground">Score moy.</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-1.5">
            <p className="text-xs font-bold text-success">{stat.active_passports || 0}</p>
            <p className="text-[8px] text-muted-foreground">Passeports</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-1.5">
            <p className="text-xs font-bold text-primary">{stat.recent_improvements || 0}</p>
            <p className="text-[8px] text-muted-foreground">Rénovations</p>
          </div>
        </div>

        {topRenos && topRenos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topRenos.slice(0, 3).map((r, i) => (
              <Badge key={i} variant="outline" className="text-[8px] h-4 px-1.5">{r}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyMapPage;
