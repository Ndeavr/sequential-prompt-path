/**
 * UNPRO — Command Palette (⌘K)
 * Global command palette with search, actions, and navigation.
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/components/ui/command";
import {
  Search, Home, Users, Globe, HelpCircle, Wrench, FileText,
  Sparkles, BarChart3, ShieldCheck, CreditCard, Plus, Building,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  labelEn?: string;
  to: string;
  icon: typeof Search;
  group: string;
  groupEn?: string;
  keywords?: string;
}

const paletteItems: PaletteItem[] = [
  // Actions rapides
  { id: "create-project", label: "Créer mon projet", labelEn: "Create My Project", to: "/signup", icon: Plus, group: "Actions rapides", groupEn: "Quick Actions", keywords: "project create nouveau" },
  { id: "talk-alex", label: "Parler à Alex", labelEn: "Talk to Alex", to: "/alex", icon: Sparkles, group: "Actions rapides", groupEn: "Quick Actions", keywords: "ai assistant copilot" },
  { id: "verify", label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", to: "/verifier-entrepreneur", icon: ShieldCheck, group: "Actions rapides", groupEn: "Quick Actions", keywords: "verify check" },
  { id: "compare", label: "Comparer mes soumissions", labelEn: "Compare My Quotes", to: "/compare-quotes", icon: BarChart3, group: "Actions rapides", groupEn: "Quick Actions", keywords: "compare quotes soumissions" },
  { id: "diagnostic", label: "Diagnostiquer un problème", labelEn: "Diagnose a Problem", to: "/alex?intent=diagnostic", icon: Search, group: "Actions rapides", groupEn: "Quick Actions", keywords: "diagnostic problem" },
  // Pages
  { id: "home", label: "Accueil", labelEn: "Home", to: "/", icon: Home, group: "Pages", keywords: "accueil home" },
  { id: "homeowners", label: "Propriétaires", labelEn: "Homeowners", to: "/proprietaires", icon: Home, group: "Pages", keywords: "proprietaires homeowners" },
  { id: "contractors", label: "Entrepreneurs", labelEn: "Contractors", to: "/entrepreneurs", icon: Users, group: "Pages", keywords: "entrepreneurs contractors" },
  { id: "condo", label: "Condo", to: "/condo", icon: Building, group: "Pages", keywords: "condo immeuble" },
  { id: "pricing", label: "Plans et tarifs", labelEn: "Plans & Pricing", to: "/pricing", icon: CreditCard, group: "Pages", keywords: "pricing plans tarifs" },
  // Explorer
  { id: "problems", label: "Problèmes maison", labelEn: "Home Problems", to: "/problemes", icon: HelpCircle, group: "Explorer", groupEn: "Explore", keywords: "problems problemes" },
  { id: "services", label: "Services", to: "/services", icon: Wrench, group: "Explorer", groupEn: "Explore", keywords: "services" },
  { id: "professionals", label: "Professionnels", labelEn: "Professionals", to: "/professionnels", icon: Users, group: "Explorer", groupEn: "Explore", keywords: "professionals professionnels" },
  { id: "cities", label: "Villes", labelEn: "Cities", to: "/villes", icon: Globe, group: "Explorer", groupEn: "Explore", keywords: "cities villes montreal laval" },
  { id: "guides", label: "Guides", to: "/guides", icon: FileText, group: "Explorer", groupEn: "Explore", keywords: "guides articles" },
  { id: "faq", label: "FAQ", to: "/faq", icon: HelpCircle, group: "Explorer", groupEn: "Explore", keywords: "faq questions" },
];

export default function CommandPalette({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    paletteItems.forEach(item => {
      const key = item.group;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, []);

  const handleSelect = (to: string) => {
    navigate(to);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={lang === "en" ? "Search pages, actions, tools…" : "Rechercher pages, actions, outils…"} />
      <CommandList>
        <CommandEmpty>{lang === "en" ? "No results found." : "Aucun résultat."}</CommandEmpty>
        {Array.from(groups.entries()).map(([group, items], i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={lang === "en" ? (items[0]?.groupEn || group) : group}>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.labelEn || ""} ${item.keywords || ""}`}
                  onSelect={() => handleSelect(item.to)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{lang === "en" && item.labelEn ? item.labelEn : item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
