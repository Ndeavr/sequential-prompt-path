/**
 * PageContractorLeads — Dashboard des leads entrepreneurs importés
 * Mobile-first, premium UX
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Search, Building2, MapPin, Phone, Mail, Shield, Clock, CheckCircle2, AlertCircle, User2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type LeadStatus = "new" | "ready_for_contact" | "contacted" | "qualified" | "converted";
type ProfileStatus = "missing" | "draft" | "complete" | "verified";

interface ContractorLead {
  id: string;
  company_name: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  province: string | null;
  category_primary: string | null;
  lead_status: string;
  profile_status: string;
  rbq_license: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  new: { label: "Nouveau", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  ready_for_contact: { label: "Prêt", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  contacted: { label: "Contacté", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Mail },
  qualified: { label: "Qualifié", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Shield },
  converted: { label: "Converti", color: "bg-primary/20 text-primary border-primary/30", icon: CheckCircle2 },
};

const profileStatusConfig: Record<string, { label: string; color: string }> = {
  missing: { label: "Incomplet", color: "text-destructive" },
  draft: { label: "Brouillon", color: "text-amber-400" },
  complete: { label: "Complet", color: "text-emerald-400" },
  verified: { label: "Vérifié", color: "text-primary" },
};

export default function PageContractorLeads() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["contractor-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_leads")
        .select("id, company_name, full_name, first_name, last_name, email, phone, city, province, category_primary, lead_status, profile_status, rbq_license, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ContractorLead[];
    },
  });

  const filtered = leads.filter((l) => {
    const matchSearch = !search || 
      [l.company_name, l.full_name, l.city, l.email, l.phone, l.category_primary]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = !filterStatus || l.lead_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    ready: leads.filter((l) => l.lead_status === "ready_for_contact").length,
    new: leads.filter((l) => l.lead_status === "new").length,
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1.5">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-foreground">Leads entrepreneurs</h1>
            <p className="text-[10px] text-muted-foreground">{stats.total} importés · {stats.ready} prêts</p>
          </div>
          <Button size="sm" onClick={() => navigate("/business-card-import")} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Importer
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Nouveaux", value: stats.new, color: "text-blue-400" },
            { label: "Prêts", value: stats.ready, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl border border-border/50 bg-card text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm h-9"
            />
          </div>
          <Button
            variant={filterStatus ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1"
            onClick={() => setFilterStatus(filterStatus ? null : "ready_for_contact")}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterStatus ? "Prêts" : "Filtrer"}
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-3"
          >
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {search ? "Aucun résultat" : "Aucun lead importé"}
            </p>
            {!search && (
              <Button size="sm" onClick={() => navigate("/business-card-import")} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Importer une carte
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filtered.map((lead, i) => {
                const status = statusConfig[lead.lead_status] || statusConfig.new;
                const profile = profileStatusConfig[lead.profile_status] || profileStatusConfig.missing;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => {/* Future: navigate to lead detail */}}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        {lead.company_name ? (
                          <Building2 className="w-5 h-5 text-primary" />
                        ) : (
                          <User2 className="w-5 h-5 text-primary" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {lead.company_name || lead.full_name || "Sans nom"}
                          </p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 border ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>

                        {lead.full_name && lead.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{lead.full_name}</p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {lead.city && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {lead.city}
                            </span>
                          )}
                          {lead.category_primary && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {lead.category_primary}
                            </span>
                          )}
                          {lead.rbq_license && (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> RBQ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-primary flex items-center gap-1 hover:underline">
                                <Phone className="w-3 h-3" /> Appeler
                              </a>
                            )}
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-primary flex items-center gap-1 hover:underline">
                                <Mail className="w-3 h-3" /> Email
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{formatDate(lead.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
