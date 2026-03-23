/**
 * UNPRO — Menu Taxonomy (static fallback + type definitions)
 * Used client-side until DB data loads, and as seed reference.
 */

import {
  Home, Wrench, Building2, Handshake,
  Hammer, TreePine, Zap, Scale, ShieldCheck, Wifi, Landmark,
  Paintbrush, Droplets, Thermometer, Wind, Sun, Lock, Leaf,
  Fence, Snowflake, Waves, Bug, Phone, Tv, Plug, BellRing,
  FileCheck, ClipboardCheck, Eye, HardHat, Ruler, PenTool,
  MapPin, DollarSign, BookOpen, Building, GraduationCap,
} from "lucide-react";

// ─── Role Cards ───
export const ROLE_CARDS = [
  {
    value: "owner",
    label: "Propriétaire",
    description: "Gérer ma propriété, mes services, mes projets et mon entretien",
    icon: Home,
    roleForDb: "homeowner",
  },
  {
    value: "service_business",
    label: "Entreprise de services",
    description: "Offrir des services et recevoir des opportunités qualifiées",
    icon: Wrench,
    roleForDb: "contractor",
  },
  {
    value: "property_manager",
    label: "Gestion immobilière",
    description: "Administrer des condos, des locations et des immeubles",
    icon: Building2,
    roleForDb: "homeowner",
  },
  {
    value: "partner",
    label: "Partenaire / Ambassadeur",
    description: "Municipalités, assureurs, médias, collaborateurs et partenaires",
    icon: Handshake,
    roleForDb: "homeowner",
  },
] as const;

// ─── Homeowner Intent Cards ───
export const HOMEOWNER_INTENTS = [
  { value: "improve", label: "Améliorer ma propriété", icon: Hammer, description: "Rénovation, agrandissement, mise à niveau" },
  { value: "maintain", label: "Entretenir ma propriété", icon: TreePine, description: "Entretien saisonnier, inspections, prévention" },
  { value: "fix", label: "Régler un problème", icon: Wrench, description: "Urgence, réparation, diagnostic" },
  { value: "buy_sell", label: "Acheter / vendre / évaluer", icon: Scale, description: "Courtier, inspecteur, évaluateur, notaire" },
  { value: "manage", label: "Gérer services et documents", icon: FileCheck, description: "Internet, assurance, permis, énergie" },
] as const;

// ─── Service Sections & Items ───
export interface MenuItemDef {
  slug: string;
  name: string;
  icon: typeof Home;
  isPopular?: boolean;
  isSeasonal?: boolean;
  activeMonths?: number[];
  upcomingMonths?: number[];
}

export interface MenuSectionDef {
  slug: string;
  name: string;
  icon: typeof Home;
  items: MenuItemDef[];
}

export const HOMEOWNER_SECTIONS: MenuSectionDef[] = [
  {
    slug: "renovation",
    name: "Rénovation et projets",
    icon: Hammer,
    items: [
      { slug: "roofing", name: "Toiture", icon: Home, isPopular: true },
      { slug: "insulation", name: "Isolation", icon: Thermometer, isPopular: true },
      { slug: "siding", name: "Revêtement extérieur", icon: Paintbrush },
      { slug: "paving", name: "Pavé uni", icon: HardHat },
      { slug: "excavation", name: "Excavation", icon: HardHat },
      { slug: "windows-doors", name: "Portes et fenêtres", icon: Home },
      { slug: "masonry", name: "Maçonnerie", icon: HardHat },
      { slug: "general-renovation", name: "Rénovation générale", icon: Hammer },
    ],
  },
  {
    slug: "outdoor",
    name: "Entretien extérieur",
    icon: TreePine,
    items: [
      { slug: "hedge-trimming", name: "Taille de haies", icon: Leaf, isSeasonal: true, activeMonths: [5,6,7,8,9], upcomingMonths: [4] },
      { slug: "lawn-maintenance", name: "Entretien de pelouse", icon: TreePine, isSeasonal: true, activeMonths: [4,5,6,7,8,9,10], upcomingMonths: [3] },
      { slug: "pool-maintenance", name: "Entretien de piscine", icon: Waves, isSeasonal: true, activeMonths: [5,6,7,8,9], upcomingMonths: [4] },
      { slug: "pool-opening", name: "Ouverture de piscine", icon: Waves, isSeasonal: true, activeMonths: [4,5], upcomingMonths: [3] },
      { slug: "pool-closing", name: "Fermeture de piscine", icon: Waves, isSeasonal: true, activeMonths: [9,10], upcomingMonths: [8] },
      { slug: "snow-removal", name: "Déneigement", icon: Snowflake, isSeasonal: true, activeMonths: [11,12,1,2,3], upcomingMonths: [10] },
      { slug: "roof-snow-removal", name: "Déneigement de toiture", icon: Snowflake, isSeasonal: true, activeMonths: [12,1,2,3], upcomingMonths: [11] },
      { slug: "gutter-cleaning", name: "Nettoyage de gouttières", icon: Droplets, isSeasonal: true, activeMonths: [4,5,10,11], upcomingMonths: [3,9] },
      { slug: "pressure-washing", name: "Lavage à pression", icon: Droplets, isSeasonal: true, activeMonths: [4,5,6,7,8,9], upcomingMonths: [3] },
      { slug: "tree-pruning", name: "Élagage d'arbres", icon: TreePine },
      { slug: "fences-patios", name: "Clôtures et patios", icon: Fence },
    ],
  },
  {
    slug: "technical",
    name: "Services techniques",
    icon: Zap,
    items: [
      { slug: "electrical", name: "Électricité", icon: Zap, isPopular: true },
      { slug: "plumbing", name: "Plomberie", icon: Droplets, isPopular: true },
      { slug: "heating", name: "Chauffage", icon: Thermometer },
      { slug: "heat-pump", name: "Thermopompe", icon: Wind },
      { slug: "ventilation", name: "Ventilation", icon: Wind },
      { slug: "air-conditioning", name: "Climatisation", icon: Wind, isSeasonal: true, activeMonths: [4,5,6,7,8], upcomingMonths: [3] },
      { slug: "geothermal", name: "Géothermie", icon: Thermometer },
      { slug: "solar-panels", name: "Panneaux solaires", icon: Sun },
      { slug: "generator", name: "Génératrice", icon: Zap },
      { slug: "home-security", name: "Sécurité résidentielle", icon: Lock },
      { slug: "wifi-optimization", name: "Optimisation Wi-Fi", icon: Wifi },
      { slug: "smart-home", name: "Maison intelligente", icon: Wifi },
    ],
  },
  {
    slug: "professional",
    name: "Services professionnels",
    icon: Scale,
    items: [
      { slug: "notary", name: "Notaire", icon: Scale },
      { slug: "real-estate-broker", name: "Courtier immobilier", icon: Home },
      { slug: "building-inspector", name: "Inspecteur en bâtiment", icon: ClipboardCheck, isPopular: true },
      { slug: "certified-appraiser", name: "Évaluateur agréé", icon: DollarSign },
      { slug: "architect", name: "Architecte", icon: PenTool },
      { slug: "interior-designer", name: "Designer d'intérieur", icon: Paintbrush },
      { slug: "engineer", name: "Ingénieur", icon: Ruler },
      { slug: "land-surveyor", name: "Arpenteur-géomètre", icon: MapPin },
    ],
  },
  {
    slug: "protection",
    name: "Protection et conformité",
    icon: ShieldCheck,
    items: [
      { slug: "home-insurance", name: "Assurance habitation", icon: ShieldCheck },
      { slug: "pre-purchase-inspection", name: "Inspection prévente", icon: Eye },
      { slug: "pre-sale-inspection", name: "Inspection prévente", icon: Eye },
      { slug: "air-quality", name: "Qualité de l'air", icon: Wind },
      { slug: "mold", name: "Moisissure", icon: Bug },
      { slug: "code-compliance", name: "Conformité au code", icon: FileCheck },
      { slug: "loss-prevention", name: "Prévention des sinistres", icon: ShieldCheck },
      { slug: "claims", name: "Réclamations", icon: FileCheck },
    ],
  },
  {
    slug: "everyday",
    name: "Services du quotidien",
    icon: Wifi,
    items: [
      { slug: "residential-internet", name: "Internet résidentiel", icon: Wifi },
      { slug: "cable-tv", name: "Câble TV", icon: Tv },
      { slug: "residential-phone", name: "Téléphone résidentiel", icon: Phone },
      { slug: "videotron", name: "Vidéotron", icon: Tv },
      { slug: "rogers", name: "Rogers", icon: Wifi },
      { slug: "bell", name: "Bell", icon: Phone },
      { slug: "energy-hydro", name: "Énergie / Hydro", icon: Plug },
      { slug: "alarm-monitoring", name: "Surveillance d'alarme", icon: BellRing },
      { slug: "smart-home-services", name: "Services maison intelligente", icon: Wifi },
    ],
  },
  {
    slug: "municipalities",
    name: "Municipalités et programmes",
    icon: Landmark,
    items: [
      { slug: "municipal-permits", name: "Permis municipaux", icon: FileCheck },
      { slug: "renovation-grants", name: "Subventions rénovation", icon: DollarSign },
      { slug: "energy-incentives", name: "Programmes énergie", icon: Plug },
      { slug: "local-regulations", name: "Réglementations locales", icon: BookOpen },
      { slug: "urban-planning", name: "Urbanisme", icon: Building },
      { slug: "municipal-taxes", name: "Taxes municipales", icon: DollarSign },
      { slug: "condo-info", name: "Copropriété / condo", icon: Building2 },
    ],
  },
];

// ─── Seasonal helpers ───
export function getActiveItems(month: number): MenuItemDef[] {
  const active: MenuItemDef[] = [];
  for (const section of HOMEOWNER_SECTIONS) {
    for (const item of section.items) {
      if (item.isSeasonal && item.activeMonths?.includes(month)) {
        active.push(item);
      }
    }
  }
  return active;
}

export function getUpcomingItems(month: number): MenuItemDef[] {
  const upcoming: MenuItemDef[] = [];
  for (const section of HOMEOWNER_SECTIONS) {
    for (const item of section.items) {
      if (item.isSeasonal && item.upcomingMonths?.includes(month)) {
        upcoming.push(item);
      }
    }
  }
  return upcoming;
}

export function getPopularItems(): MenuItemDef[] {
  const popular: MenuItemDef[] = [];
  for (const section of HOMEOWNER_SECTIONS) {
    for (const item of section.items) {
      if (item.isPopular) popular.push(item);
    }
  }
  return popular;
}
