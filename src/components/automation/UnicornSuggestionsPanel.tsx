import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, TrendingUp, Target, Globe, Zap } from "lucide-react";
import { toast } from "sonner";
import type { AutomationAgent, AutomationStats } from "@/services/automationService";

interface Suggestion {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  category: string;
  icon: typeof Zap;
  prompt: string;
}

const impactColors = {
  high: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const effortColors = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

function generateSuggestions(agents: AutomationAgent[], stats?: AutomationStats): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const disabledAgents = agents.filter(a => !a.is_enabled);
  if (disabledAgents.length > 0) {
    suggestions.push({
      title: `Activer ${disabledAgents.length} agents inactifs`,
      description: `Les agents ${disabledAgents.slice(0, 3).map(a => a.name).join(", ")} sont désactivés. Chaque agent actif augmente la couverture SEO.`,
      impact: "high",
      effort: "low",
      category: "Quick Win",
      icon: Zap,
      prompt: `Activer et configurer les agents UNPRO suivants:\n${disabledAgents.map(a => `- ${a.name} (${a.key}): ${a.description || a.category}`).join("\n")}\n\nChaque agent doit être testé avec un run manuel avant activation en production.`,
    });
  }

  if ((stats?.queuedJobs ?? 0) > 50) {
    suggestions.push({
      title: "File d'attente saturée — augmenter max_jobs_per_run",
      description: `${stats?.queuedJobs} jobs en attente. Augmenter le débit des build agents réduirait le backlog.`,
      impact: "high",
      effort: "low",
      category: "Optimisation",
      icon: TrendingUp,
      prompt: `Analyser la file d'attente automation_jobs et optimiser les paramètres max_jobs_per_run des build agents pour réduire le backlog de ${stats?.queuedJobs} jobs.`,
    });
  }

  const triggerAgents = agents.filter(a => a.category === "trigger" && a.is_enabled);
  if (triggerAgents.length < 3) {
    suggestions.push({
      title: "Ajouter plus de trigger agents",
      description: "Moins de 3 triggers actifs. Ajouter des détecteurs d'opportunité augmente le flux de pages à générer.",
      impact: "high",
      effort: "medium",
      category: "Expansion",
      icon: Target,
      prompt: `Créer de nouveaux trigger agents pour le scheduler UNPRO:\n- Seasonal Demand Agent (détecte tendances saisonnières)\n- Competitor Gap Agent (détecte opportunités vs concurrence)\n- User Intent Agent (analyse les recherches utilisateurs)\n\nChaque agent doit créer des jobs dans automation_jobs quand une opportunité est détectée.`,
    });
  }

  suggestions.push({
    title: "Expansion CLSC — couvrir les 95 CLSC du Québec",
    description: "Générer des pages par CLSC en plus des villes pour dominer les micro-marchés locaux.",
    impact: "high",
    effort: "medium",
    category: "SEO Domination",
    icon: Globe,
    prompt: `Créer un batch de blueprints SEO pour les 95 CLSC du Québec dans le Home Problem Graph.\n\nPour chaque CLSC:\n1. Créer l'entrée dans geo_areas (area_type = 'clsc')\n2. Relier aux problèmes maison les plus pertinents\n3. Générer les graph_page_blueprints (type: problem_clsc)\n4. Scorer et prioriser par population et demande\n\nFormat de sortie: JSON structuré prêt à importer.`,
  });

  suggestions.push({
    title: "Batch de 500 FAQ pages",
    description: "Générer 500 pages FAQ localisées à partir des homeowner_questions × villes les plus recherchées.",
    impact: "high",
    effort: "low",
    category: "Quick Win SEO",
    icon: Sparkles,
    prompt: `Générer un batch de 500 pages FAQ pour UNPRO.\n\nSource: table homeowner_questions croisée avec les 15 villes principales du Québec.\n\nPour chaque combinaison question × ville:\n1. Créer un graph_page_blueprint (type: faq_city)\n2. Scorer la priorité\n3. Générer le contenu structuré (quick_answer, full_answer, cost_note, urgency_note)\n4. Ajouter les liens internes recommandés\n\nSortie: JSON prêt à insérer dans graph_page_blueprints.`,
  });

  if ((stats?.todayFailed ?? 0) > 5) {
    suggestions.push({
      title: "Analyser les échecs récurrents",
      description: `${stats?.todayFailed} échecs aujourd'hui. Identifier les patterns d'erreur pour améliorer la fiabilité.`,
      impact: "medium",
      effort: "low",
      category: "Stabilité",
      icon: Target,
      prompt: `Analyser les jobs échoués dans automation_jobs (status = 'failed') des dernières 24h.\n\nIdentifier:\n1. Les agents avec le plus d'échecs\n2. Les types d'erreurs récurrentes\n3. Les patterns (même entité, même type)\n\nRecommander des corrections spécifiques pour chaque pattern.`,
    });
  }

  return suggestions;
}

interface Props {
  agents: AutomationAgent[];
  stats?: AutomationStats;
}

export default function UnicornSuggestionsPanel({ agents, stats }: Props) {
  const suggestions = useMemo(() => generateSuggestions(agents, stats), [agents, stats]);

  function copyPrompt(s: Suggestion) {
    const fullPrompt = `# UNPRO — ${s.title}\n\n## Contexte\nPlateforme UNPRO: marketplace entrepreneurs résidentiels au Québec.\nScheduler multi-agents avec ${agents.length} agents configurés.\nArchitecture: Supabase + React + Edge Functions.\n\n## Action demandée\n${s.prompt}\n\n## Critères\n- Qualité minimale: 0.7\n- Pas de duplication\n- Format JSON structuré\n- Compatible avec les tables existantes`;
    navigator.clipboard.writeText(fullPrompt);
    toast.success("Prompt copié");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Recommandations Unicorn Mode</h3>
        <Badge variant="outline" className="text-[10px]">{suggestions.length} suggestions</Badge>
      </div>

      <div className="grid gap-3">
        {suggestions.map((s, i) => (
          <Card key={i} className="border-border/40 hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <s.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className={`text-[9px] ${impactColors[s.impact]}`}>
                        Impact: {s.impact}
                      </Badge>
                      <Badge variant="outline" className={`text-[9px] ${effortColors[s.effort]}`}>
                        Effort: {s.effort}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => copyPrompt(s)}>
                      <Copy className="h-3 w-3" />
                      Copier prompt
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
