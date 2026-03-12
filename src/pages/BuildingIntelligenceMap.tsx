import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Building2, X, Star, BadgeCheck, AlertTriangle, ChevronRight,
  Filter, Layers, Search, Sparkles, Shield, Wrench, DollarSign,
  CalendarClock, Clock, Eye, EyeOff, Thermometer, ZoomIn, ZoomOut
} from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import AlexGlobalOrb from "@/components/alex/AlexGlobalOrb";

/* ════════════════════════════════════════════════════════
   MOCK DATA — replaced by real queries when DB populated
   ════════════════════════════════════════════════════════ */

interface BuildingNode {
  id: string;
  name: string;
  address: string;
  city: string;
  yearBuilt: number;
  units: number;
  healthScore: number;
  lat: number;
  lng: number;
  type: "condo" | "commercial" | "residential";
  components: { name: string; remainingLife: number; status: "good" | "warning" | "critical" }[];
  projects: { title: string; year: number; cost: number; trade: string }[];
  contractors: { name: string; aipp: number; reviews: number; verified: boolean; trade: string }[];
  reserveFundHealth: number;
}

const MOCK_BUILDINGS: BuildingNode[] = [
  {
    id: "b1", name: "Le Cartier", address: "1250 rue Sherbrooke O", city: "Montréal", yearBuilt: 1988, units: 42,
    healthScore: 74, lat: 45.497, lng: -73.577, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 4, status: "critical" },
      { name: "Fenêtres", remainingLife: 8, status: "warning" },
      { name: "Maçonnerie", remainingLife: 12, status: "good" },
      { name: "CVAC", remainingLife: 6, status: "warning" },
      { name: "Fonds de prévoyance", remainingLife: 3, status: "critical" },
    ],
    projects: [
      { title: "Réfection toiture", year: 2029, cost: 210000, trade: "Toiture" },
      { title: "Remplacement fenêtres", year: 2033, cost: 145000, trade: "Fenêtres" },
    ],
    contractors: [
      { name: "Toitures Montréal Pro", aipp: 87, reviews: 124, verified: true, trade: "Toiture" },
      { name: "FenêtreXpert", aipp: 82, reviews: 89, verified: true, trade: "Fenêtres" },
    ],
    reserveFundHealth: 58,
  },
  {
    id: "b2", name: "Place Victoria", address: "800 boul. De Maisonneuve E", city: "Montréal", yearBuilt: 1995, units: 68,
    healthScore: 82, lat: 45.514, lng: -73.561, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 11, status: "good" },
      { name: "Fenêtres", remainingLife: 5, status: "warning" },
      { name: "Maçonnerie", remainingLife: 15, status: "good" },
      { name: "Ascenseur", remainingLife: 7, status: "warning" },
      { name: "Fonds de prévoyance", remainingLife: 8, status: "good" },
    ],
    projects: [
      { title: "Remplacement fenêtres", year: 2031, cost: 285000, trade: "Fenêtres" },
    ],
    contractors: [
      { name: "Vitromax Inc.", aipp: 79, reviews: 56, verified: true, trade: "Fenêtres" },
    ],
    reserveFundHealth: 76,
  },
  {
    id: "b3", name: "Résidence du Parc", address: "455 av. du Parc", city: "Montréal", yearBuilt: 1972, units: 24,
    healthScore: 51, lat: 45.509, lng: -73.574, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 2, status: "critical" },
      { name: "Fenêtres", remainingLife: 3, status: "critical" },
      { name: "Maçonnerie", remainingLife: 5, status: "warning" },
      { name: "Plomberie", remainingLife: 4, status: "critical" },
      { name: "Fonds de prévoyance", remainingLife: 1, status: "critical" },
    ],
    projects: [
      { title: "Réfection toiture urgente", year: 2027, cost: 165000, trade: "Toiture" },
      { title: "Remplacement fenêtres", year: 2028, cost: 92000, trade: "Fenêtres" },
      { title: "Réfection plomberie", year: 2029, cost: 78000, trade: "Plomberie" },
    ],
    contractors: [
      { name: "Toitures Montréal Pro", aipp: 87, reviews: 124, verified: true, trade: "Toiture" },
      { name: "PlomberiePro QC", aipp: 74, reviews: 38, verified: true, trade: "Plomberie" },
    ],
    reserveFundHealth: 32,
  },
  {
    id: "b4", name: "Tour des Érables", address: "3200 rue Jean-Talon E", city: "Montréal", yearBuilt: 2005, units: 96,
    healthScore: 91, lat: 45.534, lng: -73.586, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 18, status: "good" },
      { name: "Fenêtres", remainingLife: 15, status: "good" },
      { name: "Maçonnerie", remainingLife: 20, status: "good" },
      { name: "CVAC", remainingLife: 12, status: "good" },
      { name: "Fonds de prévoyance", remainingLife: 15, status: "good" },
    ],
    projects: [],
    contractors: [],
    reserveFundHealth: 92,
  },
  {
    id: "b5", name: "Domaine Champlain", address: "175 Grande Allée E", city: "Québec", yearBuilt: 1990, units: 36,
    healthScore: 67, lat: 46.806, lng: -71.217, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 6, status: "warning" },
      { name: "Fenêtres", remainingLife: 4, status: "critical" },
      { name: "Maçonnerie", remainingLife: 9, status: "good" },
      { name: "Stationnement", remainingLife: 5, status: "warning" },
      { name: "Fonds de prévoyance", remainingLife: 4, status: "warning" },
    ],
    projects: [
      { title: "Remplacement fenêtres", year: 2030, cost: 125000, trade: "Fenêtres" },
      { title: "Membrane stationnement", year: 2031, cost: 180000, trade: "Stationnement" },
    ],
    contractors: [
      { name: "FenêtreXpert Québec", aipp: 82, reviews: 67, verified: true, trade: "Fenêtres" },
    ],
    reserveFundHealth: 55,
  },
  {
    id: "b6", name: "Les Terrasses Laval", address: "3080 boul. Le Carrefour", city: "Laval", yearBuilt: 1998, units: 54,
    healthScore: 78, lat: 45.567, lng: -73.750, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 9, status: "good" },
      { name: "Fenêtres", remainingLife: 7, status: "warning" },
      { name: "Balcons", remainingLife: 4, status: "critical" },
      { name: "CVAC", remainingLife: 10, status: "good" },
      { name: "Fonds de prévoyance", remainingLife: 6, status: "warning" },
    ],
    projects: [
      { title: "Réparation balcons", year: 2030, cost: 195000, trade: "Balcons" },
    ],
    contractors: [
      { name: "BétonPlus Inc.", aipp: 91, reviews: 156, verified: true, trade: "Balcons" },
    ],
    reserveFundHealth: 68,
  },
  {
    id: "b7", name: "Complexe Saint-Laurent", address: "1500 boul. Saint-Laurent", city: "Montréal", yearBuilt: 1982, units: 30,
    healthScore: 59, lat: 45.512, lng: -73.567, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 3, status: "critical" },
      { name: "Maçonnerie", remainingLife: 6, status: "warning" },
      { name: "Électricité", remainingLife: 5, status: "warning" },
      { name: "Plomberie", remainingLife: 7, status: "warning" },
      { name: "Fonds de prévoyance", remainingLife: 2, status: "critical" },
    ],
    projects: [
      { title: "Réfection toiture", year: 2028, cost: 155000, trade: "Toiture" },
      { title: "Mise à niveau électrique", year: 2031, cost: 68000, trade: "Électricité" },
    ],
    contractors: [
      { name: "Toitures Montréal Pro", aipp: 87, reviews: 124, verified: true, trade: "Toiture" },
      { name: "Électrik Plus", aipp: 76, reviews: 45, verified: true, trade: "Électricité" },
    ],
    reserveFundHealth: 41,
  },
  {
    id: "b8", name: "Habitat Longueuil", address: "999 rue Saint-Charles O", city: "Longueuil", yearBuilt: 2001, units: 48,
    healthScore: 85, lat: 45.531, lng: -73.518, type: "condo",
    components: [
      { name: "Toiture", remainingLife: 14, status: "good" },
      { name: "Fenêtres", remainingLife: 10, status: "good" },
      { name: "Maçonnerie", remainingLife: 16, status: "good" },
      { name: "CVAC", remainingLife: 8, status: "warning" },
      { name: "Fonds de prévoyance", remainingLife: 11, status: "good" },
    ],
    projects: [
      { title: "Remplacement CVAC", year: 2034, cost: 115000, trade: "CVAC" },
    ],
    contractors: [
      { name: "Mécanik Pro", aipp: 75, reviews: 43, verified: true, trade: "CVAC" },
    ],
    reserveFundHealth: 82,
  },
];

/* ── Map layout constants ── */
const MAP_CITIES: Record<string, { cx: number; cy: number; label: string }> = {
  "Montréal": { cx: 50, cy: 50, label: "Montréal" },
  "Québec": { cx: 82, cy: 25, label: "Québec" },
  "Laval": { cx: 42, cy: 28, label: "Laval" },
  "Longueuil": { cx: 58, cy: 72, label: "Longueuil" },
};

function getBuildingPosition(b: BuildingNode): { x: number; y: number } {
  const city = MAP_CITIES[b.city] || { cx: 50, cy: 50 };
  // Spread buildings around city center using lat/lng offsets
  const offsetX = ((b.lng + 73.6) * 300) % 18 - 9;
  const offsetY = ((b.lat - 45.4) * 300) % 18 - 9;
  return { x: city.cx + offsetX, y: city.cy + offsetY };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getScoreGlow(score: number): string {
  if (score >= 80) return "0 0 20px rgba(16,185,129,0.4)";
  if (score >= 60) return "0 0 20px rgba(245,158,11,0.4)";
  return "0 0 20px rgba(239,68,68,0.5)";
}

const statusColors: Record<string, string> = {
  good: "text-emerald-400",
  warning: "text-amber-400",
  critical: "text-rose-400",
};

const statusBg: Record<string, string> = {
  good: "bg-emerald-500/20",
  warning: "bg-amber-500/20",
  critical: "bg-rose-500/20",
};

/* ════════════════════════════════════════
   COMPONENT: Building Detail Panel
   ════════════════════════════════════════ */
function BuildingDetailPanel({ building, onClose }: { building: BuildingNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="absolute right-0 top-0 bottom-0 w-full md:w-[420px] z-30 overflow-y-auto"
    >
      <div className="h-full bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">{building.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{building.address}, {building.city}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Construction", value: building.yearBuilt },
            { label: "Unités", value: building.units },
            { label: "Type", value: building.type === "condo" ? "Condo" : building.type },
          ].map((m) => (
            <div key={m.label} className="rounded-xl bg-white/5 border border-white/5 p-3 text-center">
              <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
              <div className="font-display font-bold text-sm mt-1">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Health Score */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Score santé bâtiment</div>
          <div className="relative w-24 h-24 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke={getScoreColor(building.healthScore)}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${building.healthScore * 2.64} 264`}
                initial={{ strokeDasharray: "0 264" }}
                animate={{ strokeDasharray: `${building.healthScore * 2.64} 264` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl font-bold" style={{ color: getScoreColor(building.healthScore) }}>
                {building.healthScore}
              </span>
            </div>
          </div>
        </div>

        {/* Component Risks */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" /> Composantes
          </h3>
          <div className="space-y-2">
            {building.components.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusBg[c.status]}`}>
                    <div className={`w-2 h-2 rounded-full ${c.status === "critical" ? "animate-pulse bg-rose-400" : c.status === "warning" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  </div>
                  <span className="text-sm">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusColors[c.status]}`}>
                    {c.remainingLife} ans
                  </span>
                  <Clock className={`w-3 h-3 ${statusColors[c.status]}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Projects */}
        {building.projects.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" /> Projets à venir
            </h3>
            <div className="space-y-2">
              {building.projects.map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="font-medium text-sm">{p.title}</div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{p.year}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{(p.cost / 1000).toFixed(0)}k $</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matched Contractors */}
        {building.contractors.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-400" /> Entrepreneurs disponibles
            </h3>
            <div className="space-y-2">
              {building.contractors.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-xs font-bold text-blue-300">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>{c.trade}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{c.aipp} AIPP</span>
                      <span>{c.reviews} avis</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-2 text-sm">
              <CalendarClock className="w-4 h-4" /> Demander une inspection
            </Button>
          </div>
        )}

        {/* Reserve Fund */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Santé fonds de prévoyance</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(building.reserveFundHealth) }}>
              {building.reserveFundHealth}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: getScoreColor(building.reserveFundHealth) }}
              initial={{ width: 0 }}
              animate={{ width: `${building.reserveFundHealth}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════ */
export default function BuildingIntelligenceMap() {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [decadeFilter, setDecadeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [contractorTrade, setContractorTrade] = useState("all");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [zoom, setZoom] = useState(1);

  const filteredBuildings = useMemo(() => {
    return MOCK_BUILDINGS.filter((b) => {
      if (searchTerm && !b.name.toLowerCase().includes(searchTerm.toLowerCase()) && !b.address.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (cityFilter !== "all" && b.city !== cityFilter) return false;
      if (b.healthScore < scoreRange[0] || b.healthScore > scoreRange[1]) return false;
      if (decadeFilter !== "all") {
        const decade = parseInt(decadeFilter);
        if (b.yearBuilt < decade || b.yearBuilt >= decade + 20) return false;
      }
      if (contractorTrade !== "all") {
        const hasUpcoming = b.components.some((c) => c.remainingLife <= 5 && c.name.toLowerCase().includes(contractorTrade.toLowerCase()));
        if (!hasUpcoming) return false;
      }
      return true;
    });
  }, [searchTerm, cityFilter, scoreRange, decadeFilter, contractorTrade]);

  const cities = useMemo(() => [...new Set(MOCK_BUILDINGS.map((b) => b.city))], []);

  const totalProjectValue = useMemo(() =>
    filteredBuildings.reduce((s, b) => s + b.projects.reduce((ps, p) => ps + p.cost, 0), 0),
  [filteredBuildings]);

  const criticalCount = useMemo(() =>
    filteredBuildings.filter((b) => b.healthScore < 60).length,
  [filteredBuildings]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">

        {/* ── Top Bar ── */}
        <div className="relative z-20 px-4 md:px-8 pt-6 pb-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                <MapPin className="w-7 h-7 text-emerald-400" />
                Carte Intelligence Bâtiment
              </h1>
              <p className="text-slate-400 text-sm mt-1">Visualisation en temps réel de la santé des immeubles</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Metrics pills */}
              <div className="hidden md:flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                  <span className="text-slate-400">Immeubles:</span> <span className="font-bold text-white">{filteredBuildings.length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
                  <span className="text-slate-400">Pipeline:</span> <span className="font-bold text-emerald-400">{(totalProjectValue / 1000000).toFixed(1)}M $</span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs">
                  <span className="text-slate-400">Critiques:</span> <span className="font-bold text-rose-400">{criticalCount}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white hover:bg-white/10 gap-1.5"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" /> Filtres
              </Button>
            </div>
          </motion.div>

          {/* ── Filter Panel ── */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] text-slate-500 uppercase mb-1 block">Recherche</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Nom ou adresse…"
                          className="bg-white/5 border-white/10 text-white pl-10 h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase mb-1 block">Ville</label>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Decade */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase mb-1 block">Décennie</label>
                      <Select value={decadeFilter} onValueChange={setDecadeFilter}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="1960">1960–1979</SelectItem>
                          <SelectItem value="1980">1980–1999</SelectItem>
                          <SelectItem value="2000">2000–2019</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Trade filter (contractor view) */}
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase mb-1 block flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> Vue entrepreneur
                      </label>
                      <Select value={contractorTrade} onValueChange={setContractorTrade}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous métiers</SelectItem>
                          <SelectItem value="toiture">Toiture</SelectItem>
                          <SelectItem value="fenêtres">Fenêtres</SelectItem>
                          <SelectItem value="maçonnerie">Maçonnerie</SelectItem>
                          <SelectItem value="cvac">CVAC</SelectItem>
                          <SelectItem value="plomberie">Plomberie</SelectItem>
                          <SelectItem value="électricité">Électricité</SelectItem>
                          <SelectItem value="balcon">Balcons</SelectItem>
                          <SelectItem value="stationnement">Stationnement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Score Range */}
                  <div className="mt-4 flex items-center gap-4">
                    <label className="text-[10px] text-slate-500 uppercase whitespace-nowrap">Score: {scoreRange[0]}–{scoreRange[1]}</label>
                    <Slider
                      min={0} max={100} step={5}
                      value={scoreRange}
                      onValueChange={setScoreRange}
                      className="flex-1 max-w-xs"
                    />
                    <div className="flex items-center gap-2 ml-auto">
                      <label className="text-[10px] text-slate-500 uppercase">Heatmap</label>
                      <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Map Area ── */}
        <div className="relative z-10 mx-4 md:mx-8 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur overflow-hidden" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>

          {/* Grid lines for map aesthetic */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]">
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={`${(i + 1) * 5}%`} x2="100%" y2={`${(i + 1) * 5}%`} stroke="white" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 20 }, (_, i) => (
              <line key={`v${i}`} x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke="white" strokeWidth="0.5" />
            ))}
          </svg>

          {/* Heatmap overlay */}
          {showHeatmap && (
            <div className="absolute inset-0 pointer-events-none z-[1]">
              {filteredBuildings.filter(b => b.healthScore < 70).map((b) => {
                const pos = getBuildingPosition(b);
                const intensity = Math.max(0.1, (70 - b.healthScore) / 70);
                return (
                  <div
                    key={`heat-${b.id}`}
                    className="absolute rounded-full"
                    style={{
                      left: `${pos.x}%`, top: `${pos.y}%`,
                      width: 120 * intensity + 40, height: 120 * intensity + 40,
                      transform: "translate(-50%, -50%)",
                      background: `radial-gradient(circle, rgba(239,68,68,${intensity * 0.25}) 0%, transparent 70%)`,
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* City labels */}
          {Object.entries(MAP_CITIES).map(([name, { cx, cy }]) => (
            <div
              key={name}
              className="absolute text-[11px] text-slate-500 font-medium pointer-events-none z-[2]"
              style={{ left: `${cx}%`, top: `${cy - 8}%`, transform: "translateX(-50%)" }}
            >
              {name}
            </div>
          ))}

          {/* Building nodes */}
          <div className="absolute inset-0 z-[5]" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
            {filteredBuildings.map((b, i) => {
              const pos = getBuildingPosition(b);
              const isSelected = selectedBuilding?.id === b.id;
              const color = getScoreColor(b.healthScore);
              const nodeSize = isSelected ? 20 : 14;

              return (
                <motion.button
                  key={b.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute group"
                  style={{
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: isSelected ? 20 : 10,
                  }}
                  onClick={() => setSelectedBuilding(isSelected ? null : b)}
                >
                  {/* Glow ring */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: nodeSize + 16, height: nodeSize + 16,
                      left: -(nodeSize + 16 - nodeSize) / 2, top: -(nodeSize + 16 - nodeSize) / 2,
                      background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                    }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Node circle */}
                  <div
                    className="rounded-full border-2 transition-all duration-200 flex items-center justify-center"
                    style={{
                      width: nodeSize, height: nodeSize,
                      borderColor: color,
                      backgroundColor: `${color}30`,
                      boxShadow: isSelected ? getScoreGlow(b.healthScore) : "none",
                    }}
                  >
                    {isSelected && <Building2 className="w-3 h-3" style={{ color }} />}
                  </div>

                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-slate-950/95 border border-white/10 rounded-lg px-3 py-2 whitespace-nowrap text-xs backdrop-blur-xl">
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-slate-400">{b.city} — <span style={{ color }}>{b.healthScore}/100</span></div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1">
            <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
              <ZoomIn className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
              <ZoomOut className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-xl text-[10px]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> &gt; 80</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> 60–80</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500" /> &lt; 60</div>
          </div>

          {/* Layers toggle */}
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${showHeatmap ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
            >
              <Thermometer className="w-4 h-4" />
              {showHeatmap ? "Heatmap actif" : "Heatmap risque"}
            </button>
          </div>

          {/* Contractor opportunity indicator */}
          {contractorTrade !== "all" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 right-4 z-20 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-300 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Vue entrepreneur: {filteredBuildings.length} immeubles avec travaux de {contractorTrade}
            </motion.div>
          )}

          {/* Building detail panel */}
          <AnimatePresence>
            {selectedBuilding && (
              <BuildingDetailPanel
                building={selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Alex AI Footer ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mx-4 md:mx-8 mt-4 mb-6"
        >
          <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 backdrop-blur-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-300">
                Bonjour. <span className="text-rose-400 font-semibold">{criticalCount} immeubles</span> dans votre secteur sont en condition critique.
                Plusieurs auront besoin de travaux de toiture dans les <span className="text-amber-400 font-semibold">5 prochaines années</span>.
                Voulez-vous voir lesquels?
              </p>
            </div>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0 text-xs shrink-0">
              Montrer
            </Button>
          </div>
        </motion.div>

        <AlexGlobalOrb />
      </div>
    </MainLayout>
  );
}
