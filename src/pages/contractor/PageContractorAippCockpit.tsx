/**
 * UNPRO — AIPP Cockpit (Private, contractor-only)
 * Shows score breakdown, trust gaps, NAP coherence, methods proofs, and one-click re-runs.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShieldCheck, Sparkles, Globe, Phone, MapPin, Star, FileSearch, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";

type Validation = any;
type Profile = any;
type Method = any;

const fieldLabel: Record<string, { label: string; icon: any }> = {
  rbq_status: { label: "Licence RBQ", icon: ShieldCheck },
  neq_status: { label: "Numéro NEQ", icon: ShieldCheck },
  insurance_status: { label: "Assurance responsabilité", icon: ShieldCheck },
  phone_status: { label: "Téléphone", icon: Phone },
  website_status: { label: "Site web", icon: Globe },
  email_status: { label: "Courriel", icon: Globe },
  google_business_status: { label: "Fiche Google Business", icon: Star },
  address_status: { label: "Adresse", icon: MapPin },
  social_status: { label: "Présence sociale", icon: Star },
};

function statusBadge(s?: string) {
  if (s === "confirmed") return <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Confirmé</Badge>;
  if (s === "unverified") return <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">À vérifier</Badge>;
  return <Badge variant="secondary" className="bg-white/5 text-white/60 border-white/10">Manquant</Badge>;
}

function statusIcon(s?: string) {
  if (s === "confirmed") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (s === "unverified") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-white/40" />;
}

function computeTrust(v?: Validation): { level: 1 | 2 | 3 | 4; label: string } {
  if (!v) return { level: 1, label: "Profil analysé" };
  const hasNAP = v.phone_status === "confirmed" && (v.address_status === "confirmed" || v.google_business_status === "confirmed");
  const hasLegal = v.rbq_status === "confirmed" && v.neq_status === "confirmed";
  const hasInsurance = v.insurance_status === "confirmed";
  if (hasLegal && hasInsurance) return { level: 4, label: "Entreprise certifiée UNPRO" };
  if (hasLegal) return { level: 3, label: "Entreprise vérifiée" };
  if (hasNAP) return { level: 2, label: "Présence commerciale validée" };
  return { level: 1, label: "Profil analysé" };
}

export default function PageContractorAippCockpit() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { nav("/auth"); return; }

    const { data: contractor } = await supabase
      .from("contractors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const contractorId = (contractor as any)?.id ?? "00000000-0000-0000-0000-000000000000";
    const { data: p } = await supabase
      .from("aipp_profiles" as any)
      .select("*")
      .eq("contractor_id", contractorId)
      .maybeSingle();

    if (!p) { setProfile(null); setLoading(false); return; }
    setProfile(p);

    const [{ data: v }, { data: m }] = await Promise.all([
      supabase.from("aipp_profile_validations" as any).select("*").eq("profile_id", p.id).maybeSingle(),
      supabase.from("aipp_detected_methods" as any).select("*").eq("profile_id", p.id).order("confidence", { ascending: false }),
    ]);
    setValidation(v ?? null);
    setMethods(m ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const trust = useMemo(() => computeTrust(validation), [validation]);

  const gaps = useMemo(() => {
    if (!validation) return Object.keys(fieldLabel);
    return Object.keys(fieldLabel).filter((k) => validation[k] !== "confirmed");
  }, [validation]);

  const runFn = async (fn: string, label: string) => {
    if (!profile) return;
    setBusy(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { profile_id: profile.id } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec");
      toast.success(`${label} — terminé`);
      await load();
    } catch (e: any) {
      toast.error(`${label} — ${e.message || "erreur"}`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#050816] text-white p-6">Chargement…</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-6 flex items-center justify-center">
        <Card className="bg-white/[0.04] border-white/10 max-w-md">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-xl font-semibold">Aucun profil AIPP</h2>
            <p className="text-white/60 text-sm">Votre profil AI Indexed n'a pas encore été créé. Contactez l'équipe UNPRO pour l'importer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-cyan-300/80">Cockpit AIPP</p>
            <h1 className="text-3xl font-bold mt-1">{profile.company_name}</h1>
            <p className="text-white/60 text-sm mt-1">
              {profile.primary_trade}{profile.primary_city ? ` · ${profile.primary_city}` : ""}
            </p>
          </div>
          <a
            href={`/ai-indexed-profiles/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-300 text-sm hover:underline"
          >
            Voir page publique ↗
          </a>
        </header>

        {/* Trust Level */}
        <Card className="bg-gradient-to-br from-cyan-500/[0.08] to-emerald-500/[0.05] border-white/10">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/60">Niveau de confiance</p>
              <p className="text-2xl font-semibold mt-1">L{trust.level} — {trust.label}</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`h-2 w-10 rounded-full ${n <= trust.level ? "bg-emerald-400" : "bg-white/10"}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Button onClick={() => runFn("aipp-verify-rbq", "RBQ")} disabled={busy !== null} variant="outline" className="border-white/10">
            <ShieldCheck className="w-4 h-4 mr-2" /> {busy === "aipp-verify-rbq" ? "Vérification…" : "Vérifier RBQ"}
          </Button>
          <Button onClick={() => runFn("aipp-verify-neq", "NEQ")} disabled={busy !== null} variant="outline" className="border-white/10">
            <ShieldCheck className="w-4 h-4 mr-2" /> {busy === "aipp-verify-neq" ? "Vérification…" : "Vérifier NEQ"}
          </Button>
          <Button onClick={() => runFn("aipp-detect-methods", "Méthodes")} disabled={busy !== null} variant="outline" className="border-white/10">
            <Sparkles className="w-4 h-4 mr-2" /> {busy === "aipp-detect-methods" ? "Analyse…" : "Détecter méthodes"}
          </Button>
        </div>

        {/* Validations grid */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">État des vérifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(fieldLabel).map(([key, { label, icon: Icon }]) => {
                const s = validation?.[key];
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon(s)}
                      <Icon className="w-4 h-4 text-white/60 shrink-0" />
                      <span className="text-sm truncate">{label}</span>
                    </div>
                    {statusBadge(s)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Gaps */}
        {gaps.length > 0 && (
          <Card className="bg-amber-500/[0.04] border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-200 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> {gaps.length} amélioration(s) possible(s)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-white/70 space-y-1 list-disc pl-5">
                {gaps.slice(0, 8).map((k) => (<li key={k}>{fieldLabel[k]?.label}</li>))}
              </ul>
              <p className="text-xs text-white/50 mt-3">
                Chaque vérification confirmée augmente votre niveau de confiance et votre visibilité publique.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Methods proofs */}
        <Card className="bg-white/[0.04] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <FileSearch className="w-5 h-5" /> Méthodes détectées ({methods.length})
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => runFn("aipp-detect-methods", "Méthodes")} disabled={busy !== null}>
              <RefreshCw className="w-3 h-3 mr-1" /> Relancer
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {methods.length === 0 && (
              <p className="text-white/60 text-sm">Aucune méthode détectée. Lancez « Détecter méthodes ».</p>
            )}
            {methods.map((m, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.service_name}</span>
                  <Badge variant={m.confidence >= 0.7 ? "default" : "secondary"}>
                    {Math.round(m.confidence * 100)}%{m.confidence < 0.7 && " · privé"}
                  </Badge>
                </div>
                <div className="text-xs text-white/70">
                  {m.method}{m.method && m.material ? " · " : ""}{m.material}
                </div>
                {m.evidence_snippet && (
                  <p className="text-xs text-white/60 italic border-l-2 border-cyan-500/40 pl-2 mt-1">
                    « {m.evidence_snippet} »
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
