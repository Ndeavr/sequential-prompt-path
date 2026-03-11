import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Graph Data ─── */
const nodes = [
  { id: "maison", title: "Maison", subtitle: "Property Passport", x: 80, y: 120, colorVar: "primary", details: ["Adresse, type, année, composantes", "Documents: taxes, photos, factures, soumissions", "Historique de travaux et contexte de propriété"], links: ["score", "documents", "historique", "ville"] },
  { id: "score", title: "Score maison", subtitle: "Santé · énergie · risque", x: 390, y: 50, colorVar: "success", details: ["Score global habitation", "Sous-scores: énergie, entretien, assurance, valeur", "Mise à jour après chaque nouveau document ou travail réalisé"], links: ["problemes"] },
  { id: "problemes", title: "Problèmes", subtitle: "30 000+ cas possibles", x: 700, y: 120, colorVar: "destructive", details: ["Humidité, toiture, grenier, fissures, ventilation, drainage", "Détection par données, documents et logique métier", "Priorisation par gravité, urgence et coût d'inaction"], links: ["solutions", "seo"] },
  { id: "solutions", title: "Solutions", subtitle: "Travaux · permis · subventions", x: 1030, y: 120, colorVar: "accent", details: ["Solution recommandée selon le problème et le type de maison", "Budget estimé, saison idéale, matériaux, catégorie pro", "Relie aussi permis, subventions et impacts assurance"], links: ["pro", "assurances", "permits", "subventions", "materiaux"] },
  { id: "pro", title: "Pro", subtitle: "Entrepreneurs / spécialistes", x: 1360, y: 120, colorVar: "secondary", details: ["Entrepreneurs, spécialités, territoires, disponibilités", "Matching selon catégorie, ville, niveau de confiance et objectifs", "Peut mener à rendez-vous, comparaison ou mandat direct"], links: ["aipp", "soumissions"] },
  { id: "aipp", title: "AIPP", subtitle: "AI Indexed Pro Profile", x: 1360, y: 350, colorVar: "primary", details: ["Profil structuré: licences, avis, réalisations, rapidité, confiance", "Tags à valeur ajoutée: Urgence 24/7, certifications, années d'expérience", "Base du score pro et du positionnement AISEO"], links: ["soumissions", "seo"] },
  { id: "soumissions", title: "Soumissions", subtitle: "Comparer · décider", x: 1030, y: 350, colorVar: "primary", details: ["Analyse de 1 à 3 soumissions", "Détection d'écarts, oublis, risques et prix inhabituels", "Pont entre la solution recommandée et le rendez-vous"], links: ["travaux"] },
  { id: "travaux", title: "Travaux réalisés", subtitle: "Preuves · suivi · impact", x: 700, y: 350, colorVar: "success", details: ["Rendez-vous, exécution, facture, photos, garantie", "Mise à jour de l'historique et de l'état de la maison", "Améliore le score maison, la valeur et la traçabilité"], links: ["historique", "score"] },
  { id: "assurances", title: "Assurances", subtitle: "Risque · conformité", x: 1030, y: 580, colorVar: "muted", details: ["Impacts potentiels selon le problème et la solution", "Responsabilité, conformité, prévention de sinistres", "Peut influencer priorités et recommandation finale"], links: ["score"] },
  { id: "documents", title: "Documents", subtitle: "Taxes · photos · factures", x: 80, y: 350, colorVar: "muted", details: ["Sources de preuve et de compréhension de la maison", "Utilisés pour enrichir le score, détecter des problèmes et rassurer", "Nourrissent l'IA et l'historique de propriété"], links: ["score", "problemes", "assurances"] },
  { id: "historique", title: "Historique travaux", subtitle: "Mémoire vivante", x: 390, y: 580, colorVar: "secondary", details: ["Tout ce qui a été recommandé, accepté, réalisé ou reporté", "Permet de comprendre l'évolution réelle de la maison", "Réutilisé pour le score, la valeur et la confiance globale"], links: ["score"] },
  { id: "ville", title: "Ville / CLSC / territoire", subtitle: "Contexte local", x: 80, y: 580, colorVar: "accent", details: ["Municipalité, zone, CLSC, bassin économique local", "Influence permis, subventions, concurrence et pros disponibles", "Crucial pour SEO local et logique de matching"], links: ["solutions", "pro", "seo"] },
  { id: "permits", title: "Permis", subtitle: "Règles municipales", x: 1360, y: 580, colorVar: "destructive", details: ["Permis requis selon ville, type de travaux et portée", "Permet de réduire erreurs, délais et mauvaises surprises", "Doit être relié directement à chaque solution"], links: ["solutions"] },
  { id: "subventions", title: "Subventions", subtitle: "Aides et programmes", x: 1690, y: 580, colorVar: "success", details: ["RénoClimat, LogisVert et autres programmes pertinents", "Relier le bon programme à la bonne maison et au bon travail", "Peut faire basculer la décision du propriétaire"], links: ["solutions"] },
  { id: "materiaux", title: "Matériaux / systèmes", subtitle: "Choix techniques", x: 1690, y: 350, colorVar: "accent", details: ["Isolants, membranes, ventilation, fenêtres, pompes, etc.", "Relier performance, coût, durabilité et compatibilité", "Aide à expliquer pourquoi une solution est meilleure qu'une autre"], links: ["solutions"] },
  { id: "seo", title: "SEO / AISEO", subtitle: "Pages et graph indexables", x: 700, y: 580, colorVar: "secondary", details: ["Pages problème, solution, ville, profil pro, knowledge pages", "Transforme UNPRO en source de vérité structurée", "Nourrit Google, ChatGPT, Gemini et les moteurs AI"], links: ["aipp", "ville", "problemes"] },
];

const edges: [string, string][] = [
  ["maison", "score"], ["maison", "documents"], ["maison", "historique"], ["maison", "ville"],
  ["documents", "score"], ["documents", "problemes"], ["documents", "assurances"],
  ["score", "problemes"], ["problemes", "solutions"],
  ["solutions", "pro"], ["solutions", "assurances"], ["solutions", "permits"], ["solutions", "subventions"], ["solutions", "materiaux"],
  ["pro", "aipp"], ["aipp", "soumissions"], ["pro", "soumissions"],
  ["soumissions", "travaux"], ["travaux", "historique"], ["travaux", "score"],
  ["historique", "score"],
  ["ville", "solutions"], ["ville", "pro"], ["ville", "seo"],
  ["problemes", "seo"], ["aipp", "seo"],
];

const NODE_W = 220;
const NODE_H = 72;
const getNode = (id: string) => nodes.find((n) => n.id === id)!;
const center = (node: (typeof nodes)[0]) => ({ x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 });

/* ─── Color helpers using design tokens ─── */
const varToFill: Record<string, string> = {
  primary: "hsl(var(--primary) / 0.15)",
  secondary: "hsl(var(--secondary) / 0.15)",
  accent: "hsl(var(--accent) / 0.15)",
  success: "hsl(var(--success) / 0.15)",
  destructive: "hsl(var(--destructive) / 0.15)",
  muted: "hsl(var(--muted-foreground) / 0.08)",
};
const varToBorder: Record<string, string> = {
  primary: "hsl(var(--primary) / 0.35)",
  secondary: "hsl(var(--secondary) / 0.35)",
  accent: "hsl(var(--accent) / 0.35)",
  success: "hsl(var(--success) / 0.35)",
  destructive: "hsl(var(--destructive) / 0.35)",
  muted: "hsl(var(--muted-foreground) / 0.18)",
};
const varToRing: Record<string, string> = {
  primary: "hsl(var(--primary) / 0.5)",
  secondary: "hsl(var(--secondary) / 0.5)",
  accent: "hsl(var(--accent) / 0.5)",
  success: "hsl(var(--success) / 0.5)",
  destructive: "hsl(var(--destructive) / 0.5)",
  muted: "hsl(var(--muted-foreground) / 0.3)",
};

/* ─── Sub-components ─── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card/60 px-5 py-3 backdrop-blur-sm">
      <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function MiniFlow({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <React.Fragment key={item}>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{item}</span>
            {i < items.length - 1 && <span className="text-xs text-muted-foreground">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PropertyGraphPage() {
  const [selected, setSelected] = useState("maison");
  const selectedNode = getNode(selected);
  const selectedSet = new Set([selected, ...selectedNode.links]);

  return (
    <div className="min-h-screen bg-background premium-bg">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">U</div>
            <span className="text-lg font-bold text-foreground">UNPRO</span>
          </div>
          <span className="text-meta text-muted-foreground">Property Knowledge Graph</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-hero-sm md:text-hero text-foreground">
            UNPRO · <span className="text-gradient">Property Knowledge Graph</span>
          </h1>
          <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">
            Version interactive du diagramme. Cliquez sur un bloc pour voir ses relations directes.
          </p>
          <div className="mt-4 flex gap-3">
            <Stat label="Nœuds" value={`${nodes.length}`} />
            <Stat label="Relations" value={`${edges.length}`} />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 xl:grid-cols-[1.5fr_420px]">
          {/* Graph canvas */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card/50 shadow-elevation backdrop-blur-xl">
            <div className="border-b border-border px-5 py-3 text-meta text-muted-foreground">
              Carte relationnelle — les éléments liés au bloc sélectionné apparaissent en surbrillance.
            </div>
            <div className="overflow-auto">
              <div className="relative h-[760px] min-w-[1930px]">
                {/* Edges */}
                <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
                  {edges.map(([from, to], i) => {
                    const a = center(getNode(from));
                    const b = center(getNode(to));
                    const active =
                      selected === from ||
                      selected === to ||
                      (selectedNode.links.includes(from) && selectedNode.links.includes(to));
                    const midX = (a.x + b.x) / 2;
                    return (
                      <path
                        key={i}
                        d={`M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`}
                        fill="none"
                        stroke={active ? "hsl(var(--primary) / 0.6)" : "hsl(var(--border))"}
                        strokeWidth={active ? 2.5 : 1.2}
                        strokeDasharray={active ? "0" : "4 7"}
                        className="transition-all duration-300"
                      />
                    );
                  })}
                </svg>

                {/* Nodes */}
                {nodes.map((node) => {
                  const active = selectedSet.has(node.id);
                  const isSelected = selected === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelected(node.id)}
                      className="absolute text-left transition-all duration-200"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: NODE_W,
                        opacity: active ? 1 : 0.4,
                        transform: active ? "scale(1.03)" : "scale(1)",
                      }}
                    >
                      <div
                        className="rounded-2xl border px-4 py-4 backdrop-blur-xl transition-shadow duration-200"
                        style={{
                          background: varToFill[node.colorVar],
                          borderColor: isSelected ? varToRing[node.colorVar] : varToBorder[node.colorVar],
                          boxShadow: isSelected
                            ? `0 0 0 2px ${varToRing[node.colorVar]}, var(--shadow-md)`
                            : active
                              ? "var(--shadow-md)"
                              : "var(--shadow-xs)",
                        }}
                      >
                        <div className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{node.subtitle}</div>
                        <div className="text-base font-semibold leading-tight text-foreground">{node.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border bg-card/60 p-5 shadow-elevation backdrop-blur-xl"
            >
              <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Bloc sélectionné</div>
              <h2 className="text-section text-foreground">{selectedNode.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selectedNode.subtitle}</p>

              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">Rôle dans UNPRO</div>
                <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {selectedNode.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-foreground">Connexions directes</div>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.links.map((id) => {
                    const linked = getNode(id);
                    return (
                      <button
                        key={id}
                        onClick={() => setSelected(id)}
                        className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {linked.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <MiniFlow
                  title="Boucle produit"
                  items={["Maison", "Score maison", "Problèmes", "Solutions", "Pro / AIPP", "Soumissions", "Travaux", "Nouveau score"]}
                />
                <MiniFlow
                  title="Boucle croissance"
                  items={["Maison", "Problèmes", "Solutions", "Ville", "AIPP", "SEO / AISEO"]}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
