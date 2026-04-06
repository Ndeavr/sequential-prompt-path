import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Building2, User, Mail, Phone, Globe, MapPin,
  Star, TrendingUp, Clock, MessageSquare, Eye, MousePointerClick,
  Send, AlertTriangle, CalendarCheck, FileText, Plus, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const crmStatusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-muted text-muted-foreground" },
  imported: { label: "Importé", color: "bg-blue-500/20 text-blue-400" },
  enriched: { label: "Enrichi", color: "bg-indigo-500/20 text-indigo-400" },
  scored: { label: "Scoré", color: "bg-violet-500/20 text-violet-400" },
  approved_to_send: { label: "Approuvé", color: "bg-emerald-500/20 text-emerald-400" },
  in_sequence: { label: "En séquence", color: "bg-cyan-500/20 text-cyan-400" },
  replied_positive: { label: "Réponse +", color: "bg-green-500/20 text-green-400" },
  replied_neutral: { label: "Réponse ~", color: "bg-yellow-500/20 text-yellow-400" },
  replied_negative: { label: "Réponse −", color: "bg-red-500/20 text-red-400" },
  meeting_booked: { label: "RDV", color: "bg-emerald-600/20 text-emerald-300" },
  converted: { label: "Converti", color: "bg-primary/20 text-primary" },
  unsubscribed: { label: "Désabonné", color: "bg-orange-500/20 text-orange-400" },
  bounced: { label: "Rebond", color: "bg-red-600/20 text-red-400" },
  suppressed: { label: "Supprimé", color: "bg-muted text-muted-foreground" },
  closed_lost: { label: "Fermé", color: "bg-muted text-muted-foreground" },
};

const eventTypeIcons: Record<string, any> = {
  imported: FileText,
  email_sent: Send,
  email_opened: Eye,
  email_clicked: MousePointerClick,
  email_replied: MessageSquare,
  bounce_received: AlertTriangle,
  meeting_booked: CalendarCheck,
  crm_status_changed: TrendingUp,
  owner_assigned: User,
  scored: Star,
};

export default function PageOutboundLeadProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");

  useEffect(() => { if (id) loadLead(); }, [id]);

  async function loadLead() {
    setLoading(true);
    const [leadRes, evtRes, msgRes, noteRes] = await Promise.all([
      supabase.from("outbound_leads").select("*").eq("id", id!).maybeSingle(),
      supabase.from("outbound_events").select("*").eq("lead_id", id!).order("event_at", { ascending: false }).limit(50),
      supabase.from("outbound_messages").select("*").eq("lead_id", id!).order("sent_at", { ascending: false }).limit(20),
      supabase.from("outbound_notes").select("*").eq("lead_id", id!).order("created_at", { ascending: false }).limit(20),
    ]);
    if (leadRes.data) {
      setLead(leadRes.data);
      const [compRes, contRes] = await Promise.all([
        leadRes.data.company_id ? supabase.from("outbound_companies").select("*").eq("id", leadRes.data.company_id).maybeSingle() : Promise.resolve({ data: null }),
        leadRes.data.contact_id ? supabase.from("outbound_contacts").select("*").eq("id", leadRes.data.contact_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setCompany(compRes.data);
      setContact(contRes.data);
    }
    setEvents(evtRes.data || []);
    setMessages(msgRes.data || []);
    setNotes(noteRes.data || []);
    setLoading(false);
  }

  async function updateStatus(status: string) {
    if (!lead) return;
    await supabase.from("outbound_leads").update({ crm_status: status }).eq("id", lead.id);
    await supabase.from("outbound_events").insert({
      lead_id: lead.id, campaign_id: lead.campaign_id,
      event_type: "crm_status_changed", event_value: status,
    });
    toast.success(`Statut → ${crmStatusConfig[status]?.label || status}`);
    loadLead();
  }

  async function addNote() {
    if (!newNote.trim() || !lead) return;
    await supabase.from("outbound_notes").insert({
      lead_id: lead.id, note_type: "manual", note_content: newNote.trim(),
    });
    setNewNote("");
    toast.success("Note ajoutée");
    loadLead();
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Chargement du profil…</div>
    </div>
  );

  if (!lead) return (
    <div className="min-h-screen bg-background p-6 text-center">
      <p className="text-muted-foreground">Lead introuvable</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/outbound/leads")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>
    </div>
  );

  const cfg = crmStatusConfig[lead.crm_status] || crmStatusConfig.new;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound/leads")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">{company?.company_name || "Lead"}</h1>
          <p className="text-sm text-muted-foreground">{contact?.full_name || "Contact inconnu"} · {company?.city}</p>
        </div>
        <Badge className={cfg.color}>{cfg.label}</Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left — Identity & Signals */}
        <div className="space-y-4">
          {/* Company Card */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Entreprise</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{company?.company_name}</p>
              <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{company?.city}, {company?.region}</div>
              <div className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3" />{company?.specialty}</div>
              {company?.website_url && <div className="flex items-center gap-1 text-muted-foreground"><Globe className="h-3 w-3" /><a href={company.website_url} target="_blank" rel="noopener" className="underline truncate">{company.website_url}</a></div>}
              {company?.google_rating && <div className="text-muted-foreground">Google: {company.google_rating}★ ({company.review_count} avis)</div>}
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{contact?.full_name}</p>
              <p className="text-muted-foreground">{contact?.role_title}</p>
              {contact?.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{contact.email}</div>}
              {contact?.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{contact.phone}</div>}
            </CardContent>
          </Card>

          {/* Scores */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Scores</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: "Priorité totale", val: lead.total_priority_score },
                { label: "Ville", val: lead.city_priority_score },
                { label: "Spécialité", val: lead.specialty_priority_score },
                { label: "AIPP upside", val: lead.aipp_upside_score },
                { label: "Personnalisation", val: lead.personalization_score },
                { label: "Outbound readiness", val: lead.outbound_readiness_score },
              ].map(s => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.val ?? "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CRM Actions */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Actions CRM</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={lead.crm_status} onValueChange={updateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(crmStatusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Center — Timeline */}
        <div className="md:col-span-2 space-y-4">
          {/* Messages */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Messages ({messages.length})</CardTitle></CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun message envoyé</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {messages.map(m => (
                    <div key={m.id} className="border border-border/30 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-medium truncate flex-1">{m.subject_rendered || "Sans objet"}</p>
                        <Badge variant="outline" className="text-xs ml-2">{m.delivery_status}</Badge>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>👁 {m.open_count || 0}</span>
                        <span>🖱 {m.click_count || 0}</span>
                        {m.sent_at && <span>{new Date(m.sent_at).toLocaleDateString("fr-CA")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Timeline CRM ({events.length})</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun événement</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {events.map(e => {
                    const Icon = eventTypeIcons[e.event_type] || FileText;
                    return (
                      <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
                        <div className="mt-0.5 p-1.5 rounded-md bg-muted"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{e.event_type.replace(/_/g, " ")}</p>
                          {e.event_value && <p className="text-xs text-muted-foreground">{e.event_value}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(e.event_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Notes ({notes.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Textarea placeholder="Ajouter une note…" value={newNote} onChange={e => setNewNote(e.target.value)} className="min-h-[60px]" />
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
              {notes.map(n => (
                <div key={n.id} className="border border-border/20 rounded-lg p-3 text-sm">
                  <p>{n.note_content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("fr-CA")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
