/**
 * UNPRO — Mega Menu System
 * Elegant, animated, keyboard-accessible mega menus.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText, BarChart3, Clock, FolderOpen, Wrench, Camera, Sparkles, DollarSign,
  ShieldCheck, Scale, Search, Phone, Home, Thermometer, Layers, Square, Flame,
  User, TrendingUp, Star, CalendarDays, CreditCard, MessageSquare, Award,
  Building, BookOpen, Wallet, Users, HelpCircle, Globe, Heart, ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MegaMenuItem {
  to: string;
  label: string;
  labelEn?: string;
  icon: LucideIcon;
  description?: string;
  descriptionEn?: string;
  badge?: string;
}

interface MegaMenuSection {
  title: string;
  titleEn?: string;
  items: MegaMenuItem[];
}

interface MegaMenuConfig {
  sections: MegaMenuSection[];
  featured?: { to: string; label: string; labelEn?: string; description: string; descriptionEn?: string };
}

const megaMenus: Record<string, MegaMenuConfig> = {
  maison: {
    sections: [
      {
        title: "Mon Passeport Maison", titleEn: "My Home Passport",
        items: [
          { to: "/proprietaires/passeport-maison", label: "Créer mon Passeport", labelEn: "Create My Passport", icon: FileText, description: "Dossier intelligent de votre propriété", descriptionEn: "Smart property file" },
          { to: "/proprietaires/score-maison", label: "Mon Score Maison", labelEn: "My Home Score", icon: BarChart3, description: "Évaluation de l'état de votre propriété", descriptionEn: "Property condition assessment" },
          { to: "/dashboard/properties", label: "Historique des travaux", labelEn: "Work History", icon: Clock },
          { to: "/dashboard/documents/upload", label: "Documents", icon: FolderOpen },
          { to: "/dashboard/maintenance", label: "Entretien recommandé", labelEn: "Recommended Maintenance", icon: Wrench },
        ],
      },
      {
        title: "Diagnostiquer un problème", titleEn: "Diagnose a Problem",
        items: [
          { to: "/alex?intent=photo", label: "Analyser une photo", labelEn: "Analyze a Photo", icon: Camera, badge: "IA" },
          { to: "/alex?intent=diagnostic", label: "Diagnostic IA", labelEn: "AI Diagnosis", icon: Sparkles, badge: "IA" },
          { to: "/problemes", label: "Causes possibles", labelEn: "Possible Causes", icon: HelpCircle },
          { to: "/outils-ia", label: "Estimation des coûts", labelEn: "Cost Estimate", icon: DollarSign },
          { to: "/alex", label: "Conseils Alex", labelEn: "Alex Advice", icon: Sparkles },
        ],
      },
      {
        title: "Trouver un professionnel", titleEn: "Find a Professional",
        items: [
          { to: "/verifier-entrepreneur", label: "Vérifier une entreprise", labelEn: "Verify a Company", icon: ShieldCheck },
          { to: "/compare-quotes", label: "Comparer mes soumissions", labelEn: "Compare My Quotes", icon: Scale },
          { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: Search },
          { to: "/dashboard/appointments", label: "Réserver un appel", labelEn: "Book a Call", icon: Phone },
        ],
      },
      {
        title: "Travaux populaires", titleEn: "Popular Projects",
        items: [
          { to: "/services/isolation-grenier", label: "Isolation", labelEn: "Insulation", icon: Thermometer },
          { to: "/services/toiture", label: "Toiture", labelEn: "Roofing", icon: Home },
          { to: "/services/fondation", label: "Fondation", labelEn: "Foundation", icon: Layers },
          { to: "/services/fenetres", label: "Fenêtres", labelEn: "Windows", icon: Square },
          { to: "/services/chauffage", label: "Chauffage", labelEn: "Heating", icon: Flame },
        ],
      },
    ],
  },
  entreprises: {
    sections: [
      {
        title: "Développer mon entreprise", titleEn: "Grow My Business",
        items: [
          { to: "/entrepreneurs/creer-mon-profil", label: "Activer mon profil", labelEn: "Activate My Profile", icon: User },
          { to: "/entrepreneurs/pages-ia", label: "Pages IA / SEO", labelEn: "AI / SEO Pages", icon: Globe, badge: "PRO" },
          { to: "/entrepreneurs/score-aipp", label: "Score AIPP", icon: Star },
          { to: "/pro/reviews", label: "Avis clients", labelEn: "Client Reviews", icon: MessageSquare },
          { to: "/entrepreneurs/profil-public", label: "Profil public", labelEn: "Public Profile", icon: ExternalLink },
        ],
      },
      {
        title: "Acquisition clients", titleEn: "Client Acquisition",
        items: [
          { to: "/entrepreneurs", label: "Page entrepreneurs", labelEn: "Entrepreneur Landing", icon: Sparkles, description: "Découvrez comment UNPRO vous apporte des clients", descriptionEn: "See how UNPRO brings you clients" },
          { to: "/entrepreneurs/calculateur", label: "Combien je perds", labelEn: "How Much Am I Losing", icon: DollarSign, description: "Calculez vos revenus perdus et le bon plan", descriptionEn: "Calculate lost revenue & the right plan", badge: "NEW" },
          { to: "/pro/leads", label: "Rendez-vous garantis", labelEn: "Guaranteed Appointments", icon: CalendarDays },
          { to: "/entrepreneurs/matching", label: "Matching propriétaires", labelEn: "Homeowner Matching", icon: Heart },
          { to: "/pro/appointments", label: "Booking intelligent", labelEn: "Smart Booking", icon: CalendarDays },
          { to: "/pro/territories", label: "Demandes locales", labelEn: "Local Requests", icon: Search },
        ],
      },
      {
        title: "Performance",
        items: [
          { to: "/pro/stats", label: "Statistiques", labelEn: "Statistics", icon: BarChart3 },
          { to: "/pro/visibility", label: "Optimiser visibilité", labelEn: "Optimize Visibility", icon: TrendingUp },
          { to: "/entrepreneurs/badges", label: "Badges UNPRO", icon: Award },
          { to: "/pro/recommendations", label: "Recommandations IA", labelEn: "AI Recommendations", icon: Sparkles },
        ],
      },
      {
        title: "Plateforme", titleEn: "Platform",
        items: [
          { to: "/pricing", label: "Plans et tarifs", labelEn: "Plans & Pricing", icon: CreditCard },
          { to: "/entrepreneurs/demo", label: "Démo", labelEn: "Demo", icon: Globe },
          { to: "/aide", label: "Centre d'aide", labelEn: "Help Center", icon: HelpCircle },
          { to: "/entrepreneurs/ambassadeur", label: "Programme ambassadeur", labelEn: "Ambassador Program", icon: Users },
          { to: "/ambassadeurs", label: "Devenir ambassadeur", labelEn: "Become an Ambassador", icon: Award },
        ],
      },
    ],
  },
  condo: {
    sections: [
      {
        title: "Gestion immeuble", titleEn: "Building Management",
        items: [
          { to: "/condo/carnet-entretien", label: "Carnet d'entretien", labelEn: "Maintenance Log", icon: BookOpen },
          { to: "/condo/passeport", label: "Passeport immeuble", labelEn: "Building Passport", icon: FileText },
          { to: "/condo/documents", label: "Documents", icon: FolderOpen },
          { to: "/condo/dashboard", label: "Tableau de bord", labelEn: "Dashboard", icon: BarChart3 },
        ],
      },
      {
        title: "Syndic / CA", titleEn: "Board",
        items: [
          { to: "/condo/dossier", label: "Créer dossier condo", labelEn: "Create Condo File", icon: FolderOpen },
          { to: "/condo/travaux", label: "Planifier travaux", labelEn: "Plan Work", icon: CalendarDays },
          { to: "/condo/historique", label: "Historique", labelEn: "History", icon: Clock },
          { to: "/condo/inviter", label: "Inviter copropriétaires", labelEn: "Invite Co-owners", icon: Users },
        ],
      },
      {
        title: "Loi 16", titleEn: "Bill 16",
        items: [
          { to: "/condo/loi-16", label: "Comprendre la loi", labelEn: "Understand the Law", icon: HelpCircle },
          { to: "/condo/fonds-de-prevoyance", label: "Fonds de prévoyance", labelEn: "Reserve Fund", icon: Wallet },
          { to: "/condo/inspection", label: "Inspection", icon: ShieldCheck },
          { to: "/condo/guides", label: "Guides", icon: BookOpen },
        ],
      },
    ],
  },
  explorer: {
    sections: [
      {
        title: "Explorer", titleEn: "Explore",
        items: [
          { to: "/problemes", label: "Problèmes maison", labelEn: "Home Problems", icon: HelpCircle },
          { to: "/services", label: "Services", icon: Wrench },
          { to: "/professionnels", label: "Professionnels", labelEn: "Professionals", icon: Users },
          { to: "/villes", label: "Villes", labelEn: "Cities", icon: Globe },
        ],
      },
      {
        title: "Ressources", titleEn: "Resources",
        items: [
          { to: "/guides", label: "Guides", icon: BookOpen },
          { to: "/blog", label: "Blog", icon: FileText },
          { to: "/conseils-renovation", label: "Conseils rénovation", labelEn: "Renovation Tips", icon: Wrench },
          { to: "/faq", label: "FAQ", icon: HelpCircle },
        ],
      },
      {
        title: "Confiance", titleEn: "Trust",
        items: [
          { to: "/comment-ca-marche", label: "Comment fonctionne UNPRO", labelEn: "How UNPRO Works", icon: HelpCircle },
          { to: "/verification", label: "Vérification entreprises", labelEn: "Company Verification", icon: ShieldCheck },
          { to: "/nos-standards", label: "Nos standards", labelEn: "Our Standards", icon: Award },
          { to: "/pourquoi-pas-3-soumissions", label: "Pourquoi le rendez-vous exclusif", labelEn: "Why Exclusive Appointments", icon: Scale },
        ],
      },
    ],
  },
};

export function getMegaMenuConfig(key: string) {
  return megaMenus[key] || null;
}

interface MegaMenuPanelProps {
  menuKey: string;
  lang: "fr" | "en";
  onClose: () => void;
}

export default function MegaMenuPanel({ menuKey, lang, onClose }: MegaMenuPanelProps) {
  const config = megaMenus[menuKey];
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="absolute left-0 right-0 top-full z-[999]"
      onMouseLeave={onClose}
    >
      <div className="mx-auto max-w-6xl px-4 pt-2 pb-4">
        <div className="rounded-2xl border border-border/30 bg-card shadow-2xl backdrop-blur-xl p-6">
          <div className={`grid gap-8 ${config.sections.length === 4 ? "grid-cols-4" : config.sections.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {config.sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  {lang === "en" && section.titleEn ? section.titleEn : section.title}
                </h3>
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
                      >
                        <item.icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-meta font-medium text-foreground group-hover:text-primary transition-colors">
                              {lang === "en" && item.labelEn ? item.labelEn : item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-caption text-muted-foreground mt-0.5 leading-snug">
                              {lang === "en" && item.descriptionEn ? item.descriptionEn : item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
