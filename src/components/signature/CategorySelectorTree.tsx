/**
 * CategorySelectorTree — Select primary + secondary categories.
 * Pre-selects detected category from GMB/activity as a pill with X.
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2, Search, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  { name: "Plomberie", subs: ["Plomberie résidentielle", "Plomberie commerciale", "Débouchage", "Chauffe-eau", "Salle de bain", "Tuyauterie"] },
  { name: "Électricité", subs: ["Résidentiel", "Commercial", "Panneau électrique", "Domotique", "Éclairage", "Bornes de recharge"] },
  { name: "Rénovation générale", subs: ["Cuisine", "Salle de bain", "Sous-sol", "Agrandissement", "Finition intérieure", "Rénovation complète"] },
  { name: "Toiture", subs: ["Bardeaux", "Membrane", "Réparation", "Inspection", "Gouttières", "Toiture plate", "Déneigement"] },
  { name: "Peinture", subs: ["Intérieur", "Extérieur", "Commercial", "Décoration", "Enduit", "Teinture"] },
  { name: "Chauffage & Climatisation", subs: ["Thermopompe", "Fournaise", "Climatisation", "Plancher radiant", "Ventilation", "Géothermie"] },
  { name: "Fondation & Structure", subs: ["Fissures", "Imperméabilisation", "Drain français", "Soulèvement", "Inspection", "Excavation"] },
  { name: "Aménagement extérieur", subs: ["Pavé uni", "Clôture", "Terrasse", "Piscine", "Paysagement", "Muret", "Éclairage extérieur"] },
  { name: "Isolation", subs: ["Grenier", "Murs", "Sous-sol", "Cellulose", "Uréthane", "Insonorisation", "Pare-vapeur"] },
  { name: "Portes & Fenêtres", subs: ["Portes d'entrée", "Fenêtres", "Portes de garage", "Moustiquaires", "Installation", "Remplacement"] },
  { name: "Revêtement extérieur", subs: ["Vinyle", "Brique", "Fibrociment", "Maçonnerie", "Crépi", "Bois", "Métal"] },
  { name: "Excavation & Terrassement", subs: ["Excavation", "Nivellement", "Drain français", "Fondations", "Démolition", "Transport"] },
  { name: "Menuiserie & Ébénisterie", subs: ["Armoires", "Moulures", "Escaliers", "Sur mesure", "Restauration"] },
  { name: "Béton & Maçonnerie", subs: ["Dalle", "Murs", "Cheminée", "Entrée", "Réparation béton", "Joints de brique"] },
  { name: "Plancher & Céramique", subs: ["Bois franc", "Céramique", "Vinyle", "Sablage", "Plancher flottant", "Époxy"] },
  { name: "Nettoyage professionnel", subs: ["Après-sinistre", "Commercial", "Résidentiel", "Conduits de ventilation", "Lavage de vitres"] },
  { name: "Déménagement", subs: ["Résidentiel", "Commercial", "Entreposage", "Piano", "Longue distance"] },
  { name: "Notaire", subs: ["Immobilier", "Succession", "Copropriété", "Droit corporatif"] },
  { name: "Courtier immobilier", subs: ["Résidentiel", "Commercial", "Investissement", "Évaluation"] },
  { name: "Entretien de terrain", subs: ["Tonte", "Déneigement", "Entretien saisonnier", "Haies", "Arrosage"] },
  { name: "Piscine & Spa", subs: ["Installation", "Entretien", "Réparation", "Ouverture / Fermeture", "Aménagement"] },
  { name: "Sécurité & Alarme", subs: ["Système d'alarme", "Caméras", "Contrôle d'accès", "Intercom", "Domotique sécurité"] },
  { name: "Gestion immobilière", subs: ["Copropriété", "Immeuble locatif", "Entretien", "Conformité", "Urgences"] },
  { name: "Architecture & Design", subs: ["Plans", "Design intérieur", "Consultation", "Permis", "Rénovation verte"] },
];

interface Props {
  categories: { primary: string; secondary: string[] };
  onChange: (c: { primary: string; secondary: string[] }) => void;
  onContinue: () => void;
  isProcessing: boolean;
  detectedPrimary?: string | null;
  importRunning?: boolean;
}

export default function CategorySelectorTree({ categories, onChange, onContinue, isProcessing, detectedPrimary, importRunning }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(categories.primary || null);
  const [search, setSearch] = useState("");
  const [showFullList, setShowFullList] = useState(!categories.primary);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.subs.some((s) => s.toLowerCase().includes(q))
    );
  }, [search]);

  const selectPrimary = (name: string) => {
    onChange({
      primary: name,
      secondary: categories.secondary.filter((s) =>
        CATEGORIES.find((c) => c.name === name)?.subs.includes(s)
      ),
    });
    setExpandedCat(name);
    setShowFullList(false);
  };

  const clearPrimary = () => {
    onChange({ primary: "", secondary: [] });
    setExpandedCat(null);
    setShowFullList(true);
  };

  const toggleSub = (sub: string) => {
    const subs = categories.secondary.includes(sub)
      ? categories.secondary.filter((s) => s !== sub)
      : [...categories.secondary, sub];
    onChange({ ...categories, secondary: subs });
  };

  const activeCat = CATEGORIES.find((c) => c.name === categories.primary);

  return (
    <div className="space-y-5">
      {/* Import status indicator */}
      {importRunning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 text-xs text-primary"
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Recherche en cours sur Google, site web...
        </motion.div>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground">Catégorie principale</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {detectedPrimary && categories.primary
            ? "Détectée automatiquement. Vous pouvez la changer."
            : "Sélectionnez votre domaine principal, puis vos spécialités."}
        </p>
      </div>

      {/* Pre-selected pill */}
      {categories.primary && !showFullList && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {detectedPrimary === categories.primary && <Sparkles className="w-3.5 h-3.5" />}
              {categories.primary}
              <button onClick={clearPrimary} className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Show sub-categories for selected primary */}
          {activeCat && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Spécialités</p>
              <div className="flex flex-wrap gap-2">
                {activeCat.subs.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => toggleSub(sub)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      categories.secondary.includes(sub)
                        ? "bg-secondary/15 border-secondary/30 text-foreground"
                        : "bg-card border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground"
                    }`}
                  >
                    {categories.secondary.includes(sub) && <Check className="w-3 h-3 inline mr-1" />}
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowFullList(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Changer de catégorie
          </button>
        </motion.div>
      )}

      {/* Full category list */}
      {showFullList && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie..."
              className="h-10 pl-9 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredCategories.map((cat) => (
              <div key={cat.name}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectPrimary(cat.name)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
                    categories.primary === cat.name
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-card border border-border/30 hover:border-border/60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      categories.primary === cat.name
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {categories.primary === cat.name && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                </motion.button>

                {expandedCat === cat.name && categories.primary === cat.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="pl-8 mt-1 space-y-1"
                  >
                    {cat.subs.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => toggleSub(sub)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                          categories.secondary.includes(sub)
                            ? "bg-secondary/10 text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            categories.secondary.includes(sub)
                              ? "bg-secondary border-secondary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {categories.secondary.includes(sub) && (
                            <Check className="w-2.5 h-2.5 text-secondary-foreground" />
                          )}
                        </div>
                        {sub}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Aucune catégorie trouvée pour « {search} »
              </p>
            )}
          </div>
        </>
      )}

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!categories.primary || isProcessing}
        onClick={onContinue}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Continuer <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </div>
  );
}
