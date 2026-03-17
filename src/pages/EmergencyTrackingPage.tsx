/**
 * UNPRO — Emergency Tracking Page (Homeowner)
 * /emergency/track/:id — Real-time status, ETA, contractor card
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, MapPin, Phone, MessageCircle, Camera, Upload, X, Truck, Wrench, Shield, Bot, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; step: number }> = {
  new: { label: "Analyse de votre demande…", icon: Clock, color: "text-primary", step: 0 },
  triage: { label: "Analyse Alex en cours…", icon: Bot, color: "text-primary", step: 1 },
  ready: { label: "Recherche du meilleur entrepreneur…", icon: MapPin, color: "text-warning", step: 2 },
  sent: { label: "Demande envoyée…", icon: Truck, color: "text-warning", step: 2 },
  dispatching: { label: "Dispatch en cours…", icon: Truck, color: "text-warning", step: 2 },
  accepted: { label: "Un entrepreneur a accepté ✅", icon: CheckCircle, color: "text-emerald-500", step: 3 },
  en_route: { label: "En route vers vous", icon: Truck, color: "text-primary", step: 4 },
  arrived: { label: "Arrivé sur place", icon: MapPin, color: "text-emerald-500", step: 5 },
  working: { label: "Intervention en cours", icon: Wrench, color: "text-primary", step: 5 },
  completed: { label: "Intervention terminée", icon: CheckCircle, color: "text-emerald-500", step: 6 },
  closed: { label: "Dossier fermé", icon: Shield, color: "text-muted-foreground", step: 6 },
  escalated: { label: "Escaladé — support en cours", icon: AlertTriangle, color: "text-destructive", step: 2 },
};

const STEPS = [
  "Demande reçue",
  "Analyse Alex",
  "Dispatch en cours",
  "Entrepreneur assigné",
  "En route",
  "Arrivé",
  "Terminé",
];

const REASSURANCE_MESSAGES = [
  "Nous suivons votre demande en temps réel.",
  "Un entrepreneur qualifié vous sera assigné rapidement.",
  "Les urgences sont priorisées selon leur gravité.",
  "Ajoutez des photos pour accélérer l'intervention.",
];

const QUICK_MESSAGES = [
  "Êtes-vous en route ?",
  "Besoin d'aide pour trouver l'adresse ?",
  "Pouvez-vous confirmer l'heure ?",
];

export default function EmergencyTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reassuranceIdx, setReassuranceIdx] = useState(0);

  // Rotate reassurance messages
  useEffect(() => {
    const t = setInterval(() => setReassuranceIdx(i => (i + 1) % REASSURANCE_MESSAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fetch request
  const { data: request, refetch: refetchReq } = useQuery({
    queryKey: ["emergency-track", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("emergency_requests").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });

  // Fetch assignment
  const { data: assignment, refetch: refetchAssign } = useQuery({
    queryKey: ["emergency-assignment", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("emergency_assignments")
        .select("*, contractors:contractor_id(business_name, specialty, city, logo_url, phone)")
        .eq("request_id", id!)
        .in("status", ["accepted", "en_route", "arrived", "working", "completed"])
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  // Fetch status events
  const { data: events = [] } = useQuery({
    queryKey: ["emergency-events", id],
    queryFn: async () => {
      // Get from emergency_status_events via assignment
      if (!assignment?.id) return [];
      const { data } = await supabase
        .from("emergency_status_events")
        .select("*")
        .eq("assignment_id", assignment.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!assignment?.id,
    refetchInterval: 10000,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`emergency-track-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests", filter: `id=eq.${id}` }, () => refetchReq())
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_assignments", filter: `request_id=eq.${id}` }, () => refetchAssign())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const currentStatus = assignment?.status || request?.status || "new";
  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.new;
  const StatusIcon = cfg.icon;
  const contractor = (assignment as any)?.contractors;
  const isAssigned = !!assignment && ["accepted", "en_route", "arrived", "working", "completed"].includes(assignment.status);

  const CATEGORIES_MAP: Record<string, string> = {
    fuite_eau: "💧 Fuite d'eau", toiture: "🏠 Toiture", chauffage: "🔥 Chauffage",
    electricite: "⚡ Électricité", plomberie: "🔧 Plomberie", infiltration: "💦 Infiltration",
    structure: "🧱 Structure", autre: "📋 Autre",
  };

  if (!request && !id) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Suivi d'urgence</span>
        {assignment?.auto_accepted && (
          <Badge variant="outline" className="ml-auto text-[10px] border-primary/30 text-primary">⚡ Auto-assigné</Badge>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* ─── STATUS HERO ─── */}
        <motion.div
          key={currentStatus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className={`w-14 h-14 rounded-full ${cfg.color.replace("text-", "bg-")}/10 flex items-center justify-center mx-auto mb-3`}>
            <StatusIcon className={`w-7 h-7 ${cfg.color}`} />
          </div>
          <h1 className="text-xl font-bold text-foreground">{cfg.label}</h1>
          {request && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {CATEGORIES_MAP[request.category] || request.category}
              </Badge>
              {request.address && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{request.address}</span>
              )}
            </div>
          )}
          {request && (
            <p className="text-xs text-muted-foreground mt-1">
              Soumis {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: fr })}
            </p>
          )}
        </motion.div>

        {/* ─── PROGRESS TIMELINE ─── */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between relative">
              {/* Progress bar */}
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-border" />
              <div
                className="absolute top-3 left-0 h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${(cfg.step / (STEPS.length - 1)) * 100}%` }}
              />
              {STEPS.map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / STEPS.length}%` }}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i <= cfg.step
                      ? i === cfg.step ? "bg-primary text-primary-foreground animate-pulse" : "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {i < cfg.step ? "✓" : i + 1}
                  </div>
                  <span className={`text-[8px] mt-1 text-center leading-tight ${i <= cfg.step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── ETA ─── */}
        {assignment?.eta_minutes && isAssigned && (
          <Card className="border-primary/20">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">ETA</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{assignment.eta_minutes} min</p>
                <p className="text-[10px] text-muted-foreground">
                  Mis à jour {formatDistanceToNow(new Date(assignment.updated_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── CONTRACTOR CARD ─── */}
        {isAssigned && contractor && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                    {contractor.logo_url ? (
                      <img src={contractor.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      contractor.business_name?.[0] || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{contractor.business_name}</p>
                    <p className="text-xs text-muted-foreground">{contractor.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">✓ Vérifié</Badge>
                      {contractor.city && <span className="text-[10px] text-muted-foreground">• {contractor.city}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {contractor.phone && (
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href={`tel:${contractor.phone}`}>
                        <Phone className="w-3 h-3 mr-1" /> Appeler
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/alex?mode=emergency")}>
                    <MessageCircle className="w-3 h-3 mr-1" /> Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── QUICK MESSAGES (when assigned) ─── */}
        {isAssigned && (
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((msg, i) => (
              <button key={i} className="px-3 py-1.5 rounded-full text-xs bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors">
                {msg}
              </button>
            ))}
          </div>
        )}

        {/* ─── LIVE STATUS EVENTS ─── */}
        {events.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Journal</p>
              <div className="space-y-2">
                {events.slice(-5).reverse().map((ev: any) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">{ev.status}{ev.note ? ` — ${ev.note}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(ev.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── REASSURANCE STRIP ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={reassuranceIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 text-center"
          >
            <p className="text-xs text-primary font-medium">{REASSURANCE_MESSAGES[reassuranceIdx]}</p>
          </motion.div>
        </AnimatePresence>

        {/* ─── HELP ACTIONS ─── */}
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => navigate("/alex?mode=emergency")}>
            <Bot className="w-4 h-4 mr-2 text-primary" /> Parler à Alex
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Camera className="w-4 h-4 mr-2" /> Ajouter des photos
          </Button>
          {!isAssigned && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive">
              <X className="w-4 h-4 mr-2" /> Annuler la demande
            </Button>
          )}
        </div>

        {/* ─── SAFETY ─── */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex gap-3">
          <Shield className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-xs text-foreground">
            <p className="font-semibold mb-1">Risque immédiat ?</p>
            <p className="text-muted-foreground">En cas de danger, appelez le <strong>911</strong>.</p>
          </div>
        </div>
      </div>

      {/* ─── STICKY MOBILE CTA ─── */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex gap-2">
        {isAssigned && contractor?.phone ? (
          <>
            <Button className="flex-1" asChild>
              <a href={`tel:${contractor.phone}`}>
                <Phone className="w-4 h-4 mr-2" /> Appeler
              </a>
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/alex?mode=emergency")}>
              <MessageCircle className="w-4 h-4 mr-2" /> Message
            </Button>
          </>
        ) : (
          <>
            <Button className="flex-1" onClick={() => navigate("/alex?mode=emergency")}>
              <Bot className="w-4 h-4 mr-2" /> Parler à Alex
            </Button>
            <Button variant="outline" className="flex-1">
              <Camera className="w-4 h-4 mr-2" /> Photos
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
