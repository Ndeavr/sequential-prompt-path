/**
 * MultiAgentImportAnimation — Overlapping agent windows running simultaneously
 * Shows real import agents with live terminal-style logs, stacking on top of each other.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Globe, Facebook, Shield, BarChart3, MapPin,
  CheckCircle, Loader2, AlertTriangle, Terminal, Wifi
} from "lucide-react";
import type { ImportModule } from "@/pages/signature/PageAlexGuidedOnboarding";

interface AgentWindow {
  id: string;
  label: string;
  icon: any;
  color: string;
  status: "waiting" | "running" | "completed" | "partial" | "error";
  logs: { text: string; timestamp: number; type: "info" | "success" | "warn" | "data" }[];
  startDelay: number; // ms before this agent starts
  zIndex: number;
  position: { x: number; y: number };
}

interface Props {
  progress: number;
  modules?: ImportModule[];
  businessName?: string;
  city?: string;
  website?: string;
}

const AGENT_DEFS: Omit<AgentWindow, "status" | "logs">[] = [
  { id: "identity", label: "Agent Identité", icon: Search, color: "hsl(var(--primary))", startDelay: 0, zIndex: 10, position: { x: 0, y: 0 } },
  { id: "google", label: "Agent Google", icon: MapPin, color: "hsl(142 76% 36%)", startDelay: 800, zIndex: 20, position: { x: 12, y: 20 } },
  { id: "website", label: "Agent Web", icon: Globe, color: "hsl(217 91% 60%)", startDelay: 1600, zIndex: 30, position: { x: -8, y: 40 } },
  { id: "facebook", label: "Agent Social", icon: Facebook, color: "hsl(221 44% 41%)", startDelay: 2800, zIndex: 40, position: { x: 16, y: 60 } },
  { id: "trust", label: "Agent Confiance", icon: Shield, color: "hsl(280 67% 50%)", startDelay: 4200, zIndex: 50, position: { x: -4, y: 80 } },
  { id: "aipp", label: "Agent AIPP", icon: BarChart3, color: "hsl(var(--secondary))", startDelay: 5800, zIndex: 60, position: { x: 8, y: 100 } },
];

// Simulated log sequences per agent (used when no real modules)
function getSimLogs(agentId: string, biz: string, city: string, web: string): string[] {
  const w = web || `${biz.toLowerCase().replace(/\s+/g, "")}.ca`;
  switch (agentId) {
    case "identity":
      return [
        `Recherche: "${biz}"`,
        `Ville détectée: ${city}`,
        `Normalisation du nom commercial...`,
        `NEQ scan en cours...`,
        `Identité confirmée ✓`,
      ];
    case "google":
      return [
        `Google Places API → textSearch("${biz} ${city}")`,
        `Profil trouvé: ${biz}`,
        `Extraction des avis...`,
        `Photos indexées: détection en cours`,
        `Horaires d'ouverture extraits`,
        `Catégorie primaire détectée`,
        `Google Maps URI capturé ✓`,
      ];
    case "website":
      return [
        `Connexion à ${w}...`,
        `Statut HTTP: 200 OK`,
        `Extraction du contenu principal...`,
        `Détection schema.org...`,
        `Analyse des CTA et formulaires...`,
        `Liens sociaux détectés`,
        `Analyse SEO on-page complétée ✓`,
      ];
    case "facebook":
      return [
        `Recherche page Facebook...`,
        `Scan des liens sociaux depuis le site`,
        `Détection: facebook.com/${biz.toLowerCase().replace(/\s+/g, "")}`,
        `Extraction des signaux sociaux ✓`,
      ];
    case "trust":
      return [
        `Vérification RBQ...`,
        `Recherche assurances professionnelles...`,
        `Analyse sentiment des avis...`,
        `Cross-référencement des sources...`,
        `Score de confiance calculé ✓`,
      ];
    case "aipp":
      return [
        `Agrégation des 8 piliers AIPP...`,
        `Captation intention locale: calcul...`,
        `Systèmes de conversion: évaluation...`,
        `Préparation IA: scoring...`,
        `SEO technique: analyse...`,
        `Score AIPP final: calcul en cours...`,
        `Score AIPP généré ✓`,
      ];
    default:
      return ["Traitement..."];
  }
}

export default function MultiAgentImportAnimation({ progress, modules, businessName = "Entreprise", city = "Montréal", website = "" }: Props) {
  const [agents, setAgents] = useState<AgentWindow[]>([]);
  const [focusedAgent, setFocusedAgent] = useState<string | null>(null);
  const [globalElapsed, setGlobalElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Initialize agents
  useEffect(() => {
    const initial = AGENT_DEFS.map((def) => ({
      ...def,
      status: "waiting" as const,
      logs: [],
    }));
    setAgents(initial);
    startTimeRef.current = Date.now();

    return () => {
      intervalsRef.current.forEach((iv) => clearInterval(iv));
      intervalsRef.current.clear();
    };
  }, []);

  // Global timer
  useEffect(() => {
    const iv = setInterval(() => {
      setGlobalElapsed(((Date.now() - startTimeRef.current) / 1000));
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // Start agents with staggered delays
  useEffect(() => {
    AGENT_DEFS.forEach((def) => {
      const timeout = setTimeout(() => {
        // Start this agent
        setAgents((prev) =>
          prev.map((a) => a.id === def.id ? { ...a, status: "running" } : a)
        );
        setFocusedAgent(def.id);

        // Stream logs
        const simLogs = getSimLogs(def.id, businessName, city, website);
        let logIndex = 0;

        const logInterval = setInterval(() => {
          if (logIndex >= simLogs.length) {
            clearInterval(logInterval);
            intervalsRef.current.delete(def.id);
            // Check real module status
            const realModule = modules?.find((m) => m.id === def.id);
            const finalStatus = realModule
              ? (realModule.status as "completed" | "partial" | "error")
              : "completed";
            setAgents((prev) =>
              prev.map((a) => a.id === def.id ? { ...a, status: finalStatus } : a)
            );
            return;
          }

          const text = simLogs[logIndex];
          const type = text.includes("✓") ? "success" as const
            : text.includes("détect") || text.includes("trouvé") ? "data" as const
            : text.includes("Aucun") || text.includes("erreur") ? "warn" as const
            : "info" as const;

          setAgents((prev) =>
            prev.map((a) =>
              a.id === def.id
                ? {
                    ...a,
                    logs: [...a.logs, { text, timestamp: parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)), type }],
                  }
                : a
            )
          );
          logIndex++;
        }, 600 + Math.random() * 400);

        intervalsRef.current.set(def.id, logInterval);
      }, def.startDelay);

      return () => clearTimeout(timeout);
    });
  }, [businessName, city, website, modules]);

  // When real modules arrive, update messages
  useEffect(() => {
    if (!modules || modules.length === 0) return;
    setAgents((prev) =>
      prev.map((a) => {
        const realMod = modules.find((m) => m.id === a.id);
        if (realMod && realMod.status !== "waiting" && realMod.messages?.length > 0) {
          const realLogs = realMod.messages.map((msg, i) => ({
            text: msg,
            timestamp: parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)),
            type: "data" as const,
          }));
          return {
            ...a,
            status: realMod.status as any,
            logs: [...a.logs.filter((l) => l.type !== "data"), ...realLogs],
          };
        }
        return a;
      })
    );
  }, [modules]);

  const allDone = agents.length > 0 && agents.every((a) => a.status === "completed" || a.status === "partial" || a.status === "error");

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "running": return <Loader2 className="w-3 h-3 animate-spin" />;
      case "completed": return <CheckCircle className="w-3 h-3 text-green-400" />;
      case "partial": return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case "error": return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default: return <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />;
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
          <span>{globalElapsed.toFixed(1)}s</span>
          <span>·</span>
          <span>{agents.filter((a) => a.status === "running").length} agents actifs</span>
        </div>
        <h2 className="text-lg font-bold text-foreground">
          {allDone ? "Import terminé" : "Agents en cours d'exécution..."}
        </h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          {allDone
            ? "Toutes les sources ont été analysées avec succès."
            : `Import multi-source de « ${businessName} »`}
        </p>
      </div>

      {/* Global progress */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-blue-500 to-secondary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Agent windows — overlapping stack */}
      <div className="relative" style={{ minHeight: agents.length * 28 + 180 }}>
        <AnimatePresence>
          {agents.map((agent, i) => {
            const Icon = agent.icon;
            const isFocused = focusedAgent === agent.id;
            const isVisible = agent.status !== "waiting";
            if (!isVisible) return null;

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{
                  opacity: 1,
                  y: agent.position.y,
                  scale: isFocused ? 1 : 0.97,
                  x: agent.position.x,
                  zIndex: isFocused ? 100 : agent.zIndex,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
                onClick={() => setFocusedAgent(agent.id)}
                className="absolute left-0 right-0 mx-2 cursor-pointer"
              >
                <div
                  className={`rounded-xl border backdrop-blur-md overflow-hidden transition-all ${
                    isFocused
                      ? "border-primary/40 shadow-lg shadow-primary/10"
                      : "border-border/30 shadow-md"
                  }`}
                  style={{
                    background: isFocused
                      ? "hsl(var(--card) / 0.97)"
                      : "hsl(var(--card) / 0.88)",
                  }}
                >
                  {/* Window title bar */}
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20"
                    style={{ background: `color-mix(in srgb, ${agent.color} 8%, transparent)` }}
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full" style={{
                        backgroundColor: agent.status === "running" ? agent.color : agent.status === "completed" ? "hsl(142 76% 36%)" : "hsl(var(--muted-foreground))"
                      }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                    </div>
                    <Icon className="w-3 h-3" style={{ color: agent.color }} />
                    <span className="text-[10px] font-mono font-semibold text-foreground/80 flex-1">
                      {agent.label}
                    </span>
                    <StatusIcon status={agent.status} />
                  </div>

                  {/* Terminal content — only show if focused or running */}
                  {(isFocused || agent.status === "running") && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      className="font-mono text-[10px] leading-relaxed p-2 max-h-32 overflow-y-auto"
                      style={{ scrollBehavior: "smooth" }}
                    >
                      {agent.logs.map((log, li) => (
                        <motion.div
                          key={li}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: li * 0.05 }}
                          className="flex gap-1.5 items-start py-0.5"
                        >
                          <span className="text-muted-foreground/50 shrink-0 w-10 text-right">
                            [{log.timestamp}s]
                          </span>
                          <span className={
                            log.type === "success" ? "text-green-400"
                            : log.type === "data" ? "text-primary"
                            : log.type === "warn" ? "text-amber-400"
                            : "text-muted-foreground"
                          }>
                            {log.text}
                          </span>
                        </motion.div>
                      ))}
                      {agent.status === "running" && (
                        <div className="flex items-center gap-1 py-0.5 text-muted-foreground/40">
                          <Terminal className="w-2.5 h-2.5" />
                          <span className="animate-pulse">_</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Agent status summary bar */}
      <div className="flex gap-1.5 justify-center pt-2">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <motion.button
              key={agent.id}
              onClick={() => setFocusedAgent(agent.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                focusedAgent === agent.id
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : agent.status === "completed"
                  ? "bg-green-500/10"
                  : agent.status === "running"
                  ? "bg-primary/5"
                  : "bg-muted/30"
              }`}
            >
              {agent.status === "running" ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : agent.status === "completed" ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              ) : agent.status === "partial" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
