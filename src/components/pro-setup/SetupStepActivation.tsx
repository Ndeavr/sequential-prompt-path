/**
 * Setup Step 6: Recap & Activation
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Rocket, Building2, Wrench, MapPin, FileText, Camera, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import ScoreRing from "@/components/ui/score-ring";

interface Props {
  profile: any;
  onComplete: () => void;
  onBack: () => void;
}

type CheckItem = {
  label: string;
  icon: typeof Building2;
  done: boolean;
  detail: string;
};

export default function SetupStepActivation({ profile, onComplete, onBack }: Props) {
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    checkAll();
  }, [profile?.id]);

  const checkAll = async () => {
    setLoading(true);
    const cid = profile.id;

    const [servicesRes, areasRes, docsRes, photosRes] = await Promise.all([
      supabase.from("contractor_services").select("id", { count: "exact", head: true }).eq("contractor_id", cid).eq("is_active", true),
      supabase.from("contractor_service_areas").select("id", { count: "exact", head: true }).eq("contractor_id", cid),
      supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("user_id", profile.user_id).eq("bucket", "contractor-documents"),
      supabase.from("contractor_media").select("id", { count: "exact", head: true }).eq("contractor_id", cid),
    ]);

    const hasProfile = !!(profile.business_name && profile.specialty && profile.phone);
    const servicesCount = servicesRes.count ?? 0;
    const areasCount = areasRes.count ?? 0;
    const docsCount = docsRes.count ?? 0;
    const photosCount = photosRes.count ?? 0;

    setChecks([
      { label: "Profil entreprise", icon: Building2, done: hasProfile, detail: hasProfile ? "Complété" : "Incomplet — nom, spécialité, téléphone requis" },
      { label: "Services", icon: Wrench, done: servicesCount > 0, detail: servicesCount > 0 ? `${servicesCount} service(s)` : "Aucun service" },
      { label: "Zones desservies", icon: MapPin, done: areasCount > 0, detail: areasCount > 0 ? `${areasCount} zone(s)` : "Aucune zone" },
      { label: "Documents", icon: FileText, done: docsCount > 0, detail: docsCount > 0 ? `${docsCount} document(s)` : "Optionnel" },
      { label: "Photos", icon: Camera, done: photosCount > 0, detail: photosCount > 0 ? `${photosCount} photo(s)` : "Optionnel" },
    ]);

    setLoading(false);
  };

  const completedCount = checks.filter(c => c.done).length;
  const totalRequired = 3; // profile + services + zones
  const requiredDone = checks.slice(0, 3).filter(c => c.done).length;
  const completeness = checks.length > 0 ? Math.round((completedCount / checks.length) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Récapitulatif</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Vérifiez votre profil et activez votre compte entrepreneur.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-5">
        {/* Score ring */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2">
              {!loading && <ScoreRing score={completeness} size={80} strokeWidth={6} />}
            </div>
            <p className="text-sm font-medium text-foreground">{completeness}% complété</p>
            <p className="text-xs text-muted-foreground">{completedCount}/{checks.length} sections</p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-6 text-sm text-muted-foreground animate-pulse">Vérification…</div>
          ) : (
            checks.map((item, i) => {
              const Icon = item.icon;
              const isRequired = i < 3;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    item.done
                      ? "border-success/20 bg-success/5"
                      : isRequired
                      ? "border-warning/20 bg-warning/5"
                      : "border-border/30 bg-background/30"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${item.done ? "bg-success/10" : isRequired ? "bg-warning/10" : "bg-muted/20"}`}>
                    <Icon className={`h-4 w-4 ${item.done ? "text-success" : isRequired ? "text-warning" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {item.label}
                      {isRequired && !item.done && <span className="text-[10px] text-warning font-bold">REQUIS</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : isRequired ? (
                    <AlertCircle className="h-5 w-5 text-warning shrink-0" />
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {requiredDone < totalRequired && (
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning text-center">
            Complétez les sections requises pour activer la réception de rendez-vous.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
        <Button
          onClick={onComplete}
          disabled={loading || requiredDone < totalRequired}
          className="rounded-2xl px-8 gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          <Rocket className="h-4 w-4" />
          Activer mon profil
        </Button>
      </div>
    </motion.div>
  );
}
