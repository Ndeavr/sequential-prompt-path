/**
 * UNPRO — EmergencyRequestCard (Contractor Side)
 * Compact + expanded view for emergency requests
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MapPin, Clock, Camera, ChevronDown, Check, X, Phone, MessageCircle, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REFUSAL_REASONS = [
  { key: "not_specialty", label: "Pas ma spécialité" },
  { key: "too_far", label: "Trop loin" },
  { key: "unavailable", label: "Non disponible" },
  { key: "not_urgent_type", label: "Pas ce type d'urgence" },
  { key: "other", label: "Autre" },
];

const ETA_OPTIONS = [
  { value: "10", label: "10 min" },
  { value: "20", label: "20 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 heure" },
];

interface Props {
  match: any;
  request: any;
  onResponse?: () => void;
}

export default function EmergencyRequestCard({ match, request, onResponse }: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [responding, setResponding] = useState(false);
  const [showRefusal, setShowRefusal] = useState(false);
  const [refusalReason, setRefusalReason] = useState("");
  const [showEta, setShowEta] = useState(false);
  const [accepted, setAccepted] = useState(match.status === "accepted");

  const handleAccept = async () => {
    setResponding(true);
    try {
      await supabase.from("emergency_matches").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", match.id);
      await supabase.from("emergency_assignments").insert({
        request_id: request.id,
        contractor_id: match.contractor_id,
        status: "accepted",
      });
      await supabase.from("emergency_events").insert({ request_id: request.id, event_type: "contractor_accepted", payload: { contractor_id: match.contractor_id } });
      setAccepted(true);
      setShowEta(true);
      toast({ title: "Urgence acceptée ✅" });
      onResponse?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setResponding(false);
  };

  const handleRefuse = async () => {
    if (!refusalReason) { toast({ title: "Raison requise", variant: "destructive" }); return; }
    setResponding(true);
    try {
      await supabase.from("emergency_matches").update({ status: "refused", responded_at: new Date().toISOString(), refusal_reason: refusalReason }).eq("id", match.id);
      await supabase.from("emergency_events").insert({ request_id: request.id, event_type: "contractor_refused", payload: { contractor_id: match.contractor_id, reason: refusalReason } });
      toast({ title: "Urgence refusée" });
      onResponse?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setResponding(false);
  };

  const sendEta = async (minutes: string) => {
    await supabase.from("emergency_assignments").update({ eta_minutes: parseInt(minutes) }).eq("request_id", request.id).eq("contractor_id", match.contractor_id);
    await supabase.from("emergency_status_events").insert({ assignment_id: match.id, status: "eta_sent", note: `${minutes} min` });
    toast({ title: `ETA envoyé: ${minutes} min` });
  };

  const sendStatus = async (status: string) => {
    await supabase.from("emergency_assignments").update({ status }).eq("request_id", request.id).eq("contractor_id", match.contractor_id);
    await supabase.from("emergency_status_events").insert({ assignment_id: match.id, status, note: "" });
    toast({ title: `Statut: ${status}` });
  };

  const severityColor = request.severity === "critical" ? "border-destructive bg-destructive/5" : request.severity === "high" ? "border-warning bg-warning/5" : "border-border";

  return (
    <Card className={`overflow-hidden transition-all ${severityColor}`}>
      <CardContent className="p-4">
        {/* Compact View */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={request.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                {request.severity === "critical" ? "🔴" : "🟠"} {request.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{request.category}</Badge>
            </div>
            <p className="text-sm font-medium text-foreground line-clamp-2">{request.triage_summary || request.description || "Urgence sans description"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {request.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.address.split(",").pop()?.trim()}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(request.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</span>
              {request.photo_urls?.length > 0 && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{request.photo_urls.length}</span>}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1">
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Expanded View */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-4 mt-4 border-t border-border space-y-3">
                {/* Photos */}
                {request.photo_urls?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {request.photo_urls.map((url: string, i: number) => (
                      <div key={i} className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        <div className="w-full h-full bg-muted-foreground/10 flex items-center justify-center text-xs text-muted-foreground">📷 {i + 1}</div>
                      </div>
                    ))}
                  </div>
                )}

                {request.description && (
                  <div><p className="text-xs font-medium text-foreground mb-1">Description</p><p className="text-xs text-muted-foreground">{request.description}</p></div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Intent:</span> <strong>{request.intent_score}</strong></div>
                  <div><span className="text-muted-foreground">ASAP:</span> <strong>{request.asap_requested ? "Oui" : "Non"}</strong></div>
                  <div><span className="text-muted-foreground">Contact:</span> <strong>{request.preferred_contact}</strong></div>
                  <div><span className="text-muted-foreground">Empire:</span> <strong>{request.getting_worse ? "Oui ⚠️" : "Non"}</strong></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!accepted && match.status === "pending" && (
          <div className="mt-4 space-y-2">
            {!showRefusal ? (
              <div className="flex gap-2">
                <Button onClick={handleAccept} disabled={responding} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                  <Check className="w-4 h-4 mr-1" /> Accepter
                </Button>
                <Button onClick={() => setShowRefusal(true)} disabled={responding} variant="outline" className="flex-1 border-destructive text-destructive">
                  <X className="w-4 h-4 mr-1" /> Refuser
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={refusalReason} onValueChange={setRefusalReason}>
                  <SelectTrigger><SelectValue placeholder="Raison du refus..." /></SelectTrigger>
                  <SelectContent>
                    {REFUSAL_REASONS.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={handleRefuse} disabled={responding || !refusalReason} variant="destructive" size="sm" className="flex-1">Confirmer refus</Button>
                  <Button onClick={() => setShowRefusal(false)} variant="outline" size="sm">Annuler</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted: ETA + Status */}
        {accepted && (
          <div className="mt-4 space-y-3 pt-3 border-t border-success/30">
            <Badge className="bg-success text-success-foreground">✅ Assigné</Badge>
            {showEta && (
              <div>
                <p className="text-xs font-medium mb-2">Envoyez votre ETA :</p>
                <div className="flex gap-2 flex-wrap">
                  {ETA_OPTIONS.map(opt => (
                    <Button key={opt.value} size="sm" variant="outline" onClick={() => sendEta(opt.value)}>{opt.label}</Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => sendStatus("en_route")}><Navigation className="w-3 h-3 mr-1" /> En route</Button>
              <Button size="sm" variant="outline" onClick={() => sendStatus("arrived")}><MapPin className="w-3 h-3 mr-1" /> Arrivé</Button>
              <Button size="sm" variant="outline" onClick={() => sendStatus("completed")}><Check className="w-3 h-3 mr-1" /> Terminé</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
