/**
 * UNPRO — Intelligent Search Bar
 * Perplexity / Command Search style with suggestions.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Home, Wrench, Users, Globe, HelpCircle, FileText, Sparkles } from "lucide-react";

const DAILY_EMOJIS = [
  "🏠", "🔧", "🏗️", "🌿", "⚡", "🪠", "🧱", "🎨",
  "🏡", "🔨", "🪟", "❄️", "🔥", "🪵", "🛠️", "🏢",
  "🌡️", "💡", "🪜", "🧹", "🏘️", "🪴", "🚿", "🪨",
  "🏕️", "🌇", "🏙️", "🌄", "🏔️", "🌅", "🌃",
];

function getDailyEmoji() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_EMOJIS[dayOfYear % DAILY_EMOJIS.length];
}

interface SearchSuggestion {
  type: "problem" | "service" | "professional" | "city" | "faq" | "tool";
  label: string;
  to: string;
  icon: typeof Search;
}

const popularSearches: SearchSuggestion[] = [
  { type: "problem", label: "Toiture qui fuit", to: "/problemes/toiture-qui-fuit", icon: Home },
  { type: "service", label: "Isolation grenier", to: "/services/isolation-grenier", icon: Wrench },
  { type: "tool", label: "Vérifier entrepreneur", to: "/verifier-entrepreneur", icon: Users },
  { type: "service", label: "Rénover cuisine", to: "/services/renovation-cuisine", icon: Wrench },
  { type: "faq", label: "Loi 16 condo", to: "/condo/loi-16", icon: HelpCircle },
];

const categories: { label: string; labelEn: string; icon: typeof Search; to: string }[] = [
  { label: "Problèmes maison", labelEn: "Home Problems", icon: HelpCircle, to: "/problemes" },
  { label: "Services", labelEn: "Services", icon: Wrench, to: "/services" },
  { label: "Professionnels", labelEn: "Professionals", icon: Users, to: "/professionnels" },
  { label: "Villes", labelEn: "Cities", icon: Globe, to: "/villes" },
  { label: "Guides", labelEn: "Guides", icon: FileText, to: "/guides" },
  { label: "Outils IA", labelEn: "AI Tools", icon: Sparkles, to: "/outils-ia" },
];

interface HeaderSearchProps {
  lang: "fr" | "en";
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

export default function HeaderSearch({ lang, variant = "desktop", onClose }: HeaderSearchProps) {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    if (focused) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(query.trim())}`);
      setFocused(false);
      setQuery("");
      onClose?.();
    }
  };

  const handleSuggestionClick = (to: string) => {
    navigate(to);
    setFocused(false);
    setQuery("");
    onClose?.();
  };

  const filtered = query.length > 1
    ? popularSearches.filter(s => s.label.toLowerCase().includes(query.toLowerCase()))
    : popularSearches;

  return (
    <div ref={ref} className={`relative ${variant === "desktop" ? "hidden md:block w-full max-w-md" : "w-full"}`}>
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center rounded-full border transition-all duration-200 ${
          focused
            ? "border-primary/40 bg-card shadow-lg ring-2 ring-primary/10"
            : "border-border/40 bg-muted/30 hover:bg-muted/50"
        }`}>
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={lang === "en" ? "Describe your problem or project…" : "Décrivez votre problème ou votre projet…"}
            className="w-full h-9 pl-10 pr-4 bg-transparent text-meta text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            aria-label={lang === "en" ? "Search" : "Rechercher"}
          />
          {query && (
            <button type="submit" className="absolute right-2 h-6 w-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions panel */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden z-50"
          >
            {/* Popular searches */}
            <div className="p-3">
              <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {lang === "en" ? "Popular Searches" : "Recherches populaires"}
              </p>
              {filtered.slice(0, 5).map((s) => (
                <button
                  key={s.to}
                  onClick={() => handleSuggestionClick(s.to)}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-meta text-foreground hover:bg-muted/40 transition-colors text-left"
                >
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.label}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-auto" />
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="border-t border-border/20 p-3">
              <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {lang === "en" ? "Categories" : "Catégories"}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.to}
                    onClick={() => handleSuggestionClick(cat.to)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-caption text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {lang === "en" ? cat.labelEn : cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="border-t border-border/20 px-4 py-2 flex items-center justify-between">
              <span className="text-caption text-muted-foreground/50">
                {lang === "en" ? "Press ⌘K for command palette" : "⌘K pour la palette de commandes"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
