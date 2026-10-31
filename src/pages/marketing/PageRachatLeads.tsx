/**
 * UNPRO — Rachat de leads.
 * Real, authenticated contractor intake; client details and evidence stay private.
 * Credit issuance is deliberately admin-reviewed. No buyer outreach runs here.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { ArrowRight, Check, FileUp, Loader2, ShieldCheck } from "lucide-react";

const CANONICAL = "https://unpro.ca/rachat-leads-entrepreneurs";
const BUCKET = "lead-repurchase-private";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const REASONS = [
  ["service", "On ne fait pas ça"],
  ["territory", "C'est trop loin"],
  ["calendar", "L'horaire ne convient pas"],
  ["capacity", "On est complets"],
  ["other", "Autre raison"],
] as const;

type Entry = {
  id: string;
  client_first_name: string;
  service_requested: string;
  client_city: string;
  created_at: string;
  status: string;
  approved_credit_cents: number;
};
type Draft = {
  company_name: string; client_first_name: string; client_last_name: string;
  client_phone: string; client_email: string; client_city: string;
  service_requested: string; project_description: string;
  project_timeline: string; mismatch_reason: string; acquisition_source: string;
  acquisition_cost: string; consent_provenance: string;
};
const EMPTY: Draft = {
  company_name: "", client_first_name: "", client_last_name: "",
  client_phone: "", client_email: "", client_city: "", service_requested: "",
  project_description: "", project_timeline: "flexible", mismatch_reason: "service",
  acquisition_source: "", acquisition_cost: "", consent_provenance: "",
};
const money = (cents: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const fieldClass = "mt-1 w-full min-w-0 rounded-xl border border-white/20 bg-[#121c2d] px-3 py-3 text-base text-white placeholder:text-slate-400 focus:border-[#6cb8ff] focus:outline-none";
const labelClass = "block text-sm font-medium text-slate-200";

export default function PageRachatLeads() {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [fileKind, setFileKind] = useState<"client_request" | "quote" | "acquisition_receipt">("client_request");
  const [consent, setConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submissions, setSubmissions] = useState<Entry[]>([]);
  const [prefs, setPrefs] = useState({
    services: "", territory: "", preferred_hours: "", sms_opt_in: false, email_opt_in: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefFeedback, setPrefFeedback] = useState("");
  // Display-only status; the server trigger is authoritative for credits.
  const [hasValidBookingSubscription, setHasValidBookingSubscription] = useState<boolean | null>(null);
  const canSubmit = isAuthenticated && (role === "contractor" || role === "admin");

  const change = (name: keyof Draft, value: string) => setDraft(old => ({ ...old, [name]: value }));
  const refresh = useCallback(async () => {
    if (!user?.id || !canSubmit) return;
    const [entries, preferences, subscription] = await Promise.all([
      supabase.from("lead_repurchase_submissions" as any)
        .select("id,client_first_name,service_requested,client_city,status,approved_credit_cents,created_at")
        .eq("owner_user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("lead_repurchase_offer_preferences" as any)
        .select("company_name,services,territory,preferred_hours,sms_opt_in,email_opt_in")
        .eq("owner_user_id", user.id).maybeSingle(),
      supabase.rpc("lead_repurchase_my_booking_subscription_valid" as any),
    ]);
    // Unknown/missing migration is NOT considered an active subscription.
    setHasValidBookingSubscription(subscription.error ? null : subscription.data === true);
    if (!entries.error) setSubmissions((entries.data ?? []) as unknown as Entry[]);
    if (preferences.data) {
      const p = preferences.data as unknown as typeof prefs & { company_name: string };
      setPrefs({
        services: p.services || "", territory: p.territory || "",
        preferred_hours: p.preferred_hours || "",
        sms_opt_in: !!p.sms_opt_in, email_opt_in: !!p.email_opt_in,
      });
      setDraft(old => ({ ...old, company_name: old.company_name || p.company_name || "" }));
    }
  }, [canSubmit, user?.id]);

  useEffect(() => {
    void logFunnelEvent({ event_type: "landing_view", step: "rachat_leads", metadata: { surface: "rachat_leads" } });
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const login = () => {
    void logFunnelEvent({ event_type: "registration_started", step: "rachat_leads" });
    saveAuthIntent({ returnPath: "/rachat-leads-entrepreneurs", action: "repurchase_lead", roleHint: "contractor" });
    navigate(contractorLoginPath("/rachat-leads-entrepreneurs") + "?method=phone");
  };

  const chooseFiles = (selected: FileList | null) => {
    const arr = Array.from(selected ?? []);
    if (arr.length > 3 || arr.some(file => !ALLOWED.has(file.type) || file.size > MAX_SIZE)) {
      setFeedback("Maximum 3 fichiers PDF ou images (JPG, PNG, WebP), de 10 Mo chacun.");
      setFiles([]);
      return;
    }
    setFeedback("");
    setFiles(arr);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !user?.id || busy) return;
    if (!consent || !termsAccepted) {
      setFeedback("Confirmez votre autorisation et acceptez les conditions pour soumettre.");
      return;
    }
    if (!draft.client_phone.trim() && !draft.client_email.trim()) {
      setFeedback("Ajoutez un téléphone ou un courriel pour joindre le client.");
      return;
    }
    if (!draft.consent_provenance.trim() || draft.consent_provenance.trim().length < 8) {
      setFeedback("Précisez comment le propriétaire a autorisé cette transmission.");
      return;
    }
    const costInput = draft.acquisition_cost.trim().replace(",", ".");
    const costNumber = costInput ? Number(costInput) : null;
    if (costNumber !== null && (!Number.isFinite(costNumber) || costNumber < 0 || costNumber > 100000)) {
      setFeedback("Entrez un coût admissible en dollars, ou laissez ce champ vide.");
      return;
    }
    if (files.some(file => !ALLOWED.has(file.type) || file.size > MAX_SIZE)) {
      setFeedback("Un fichier ne respecte pas le format ou la taille autorisés.");
      return;
    }
    setBusy(true);
    setFeedback("");
    let submissionId: string | null = null;
    try {
      const { data, error } = await supabase.from("lead_repurchase_submissions" as any).insert({
        owner_user_id: user.id,
        company_name: draft.company_name.trim(),
        client_first_name: draft.client_first_name.trim(),
        client_last_name: draft.client_last_name.trim() || null,
        client_phone: draft.client_phone.trim() || null,
        client_email: draft.client_email.trim().toLowerCase() || null,
        client_city: draft.client_city.trim(),
        service_requested: draft.service_requested.trim(),
        project_description: draft.project_description.trim(),
        project_timeline: draft.project_timeline,
        mismatch_reason: draft.mismatch_reason,
        acquisition_source: draft.acquisition_source.trim(),
        acquisition_cost_cents: costNumber === null ? null : Math.round(costNumber * 100),
        consent_attested: true,
        consent_provenance: draft.consent_provenance.trim(),
      }).select("id").single();
      if (error) throw error;
      submissionId = (data as { id: string }).id;
      let count = 0;
      for (const file of files) {
        const ext = file.type === "application/pdf" ? "pdf" :
          file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const objectPath = `${user.id}/${submissionId}/${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from(BUCKET).upload(objectPath, file, { upsert: false, contentType: file.type });
        if (upload.error) throw new Error("Téléversement incomplet : " + upload.error.message);
        const recorded = await supabase.from("lead_repurchase_documents" as any).insert({
          submission_id: submissionId, owner_user_id: user.id, storage_path: objectPath,
          kind: fileKind, original_filename: file.name.slice(0, 180),
        });
        if (recorded.error) throw new Error("Fichier téléversé, mais non lié au dossier : " + recorded.error.message);
        count += 1;
      }
      setFeedback(`Demande reçue, vérification en cours. Dossier ${submissionId.slice(0, 8).toUpperCase()}${count ? ` — ${count} fichier(s) reçu(s).` : "."}`);
      setDraft(old => ({ ...EMPTY, company_name: old.company_name }));
      setFiles([]);
      setConsent(false);
      setTermsAccepted(false);
      void logFunnelEvent({ event_type: "registration_completed", step: "rachat_leads_submission", metadata: { surface: "rachat_leads", file_count: count } });
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Une erreur est survenue.";
      setFeedback(message.includes("duplicate key") || message.includes("23505")
        ? "Cette demande semble déjà enregistrée. Vérifiez vos dossiers ci-dessous."
        : submissionId ? `Dossier ${submissionId.slice(0, 8).toUpperCase()} créé, mais un fichier n'a pas été enregistré. Communiquez avec UNPRO avec ce numéro de dossier.`
          : "L'enregistrement a échoué. Vérifiez vos informations et réessayez.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || !user?.id || savingPrefs) return;
    if (!draft.company_name.trim()) {
      setPrefFeedback("Indiquez d'abord le nom de votre entreprise.");
      return;
    }
    setSavingPrefs(true);
    setPrefFeedback("");
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("lead_repurchase_offer_preferences" as any).upsert({
        owner_user_id: user.id,
        company_name: draft.company_name.trim(),
        services: prefs.services.trim(),
        territory: prefs.territory.trim(),
        preferred_hours: prefs.preferred_hours.trim(),
        sms_opt_in: prefs.sms_opt_in,
        email_opt_in: prefs.email_opt_in,
        sms_consented_at: prefs.sms_opt_in ? now : null,
        email_consented_at: prefs.email_opt_in ? now : null,
        updated_at: now,
      }, { onConflict: "owner_user_id" });
      if (error) throw error;
      setPrefFeedback("Préférences enregistrées. Les offres admissibles restent soumises à la vérification et à la disponibilité.");
    } catch {
      setPrefFeedback("Impossible d'enregistrer vos préférences pour l'instant.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <MainLayout>
      <SeoHead title="UNPRO rachète vos leads | Entrepreneurs du Québec"
        description="Un lead trop loin, hors service ou incompatible? UNPRO rachète vos leads. Obtenez un crédit équivalent à la valeur d'un lead admissible et choisissez des rendez-vous exclusifs."
        canonical={CANONICAL} />
      <div className="min-h-screen bg-[#070e1d] text-white">
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 md:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-sky-200">Nouveau programme UNPRO</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">UNPRO rachète vos leads!</h1>
            <p className="mt-5 text-xl font-medium leading-relaxed text-sky-100 sm:text-2xl">
              Ce n'était pas pour vous? On trouve le bon entrepreneur pour ce client.
            </p>
            <p className="mt-5 text-base leading-relaxed text-slate-300">
              « On fait pas ça. » « C'est trop loin. » « On est complets. »
              Vous avez payé pour une demande qui ne correspondait pas à votre entreprise?
            </p>
            <p className="mt-5 text-xl font-bold text-white">Vous obtenez un crédit équivalent à la valeur du lead.</p>
            <p className="mt-3 text-slate-300">Échangez vos crédits contre des rendez-vous qualifiés et exclusifs, adaptés à vos services, à votre territoire et à vos disponibilités.</p>
            <a href="#echanger" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#73c2ff] px-6 py-4 font-semibold text-slate-950 hover:bg-[#a0d6ff]">
              Échanger mes leads <ArrowRight size={18} />
            </a>
          </div>

          <section className="mt-14 grid gap-3 md:grid-cols-3" aria-label="Comment ça fonctionne">
            {[
              ["01", "Vous avez une demande qui ne vous convient pas.", "Hors service, trop loin ou calendrier complet."],
              ["02", "UNPRO cherche le bon entrepreneur.", "Votre client peut poursuivre son projet avec Clara."],
              ["03", "Vous récupérez de la valeur.", "Un crédit admissible pour des rendez-vous selon vos critères."],
            ].map(([number, heading, sub]) => (
              <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <span className="font-bold text-sky-300">{number}</span>
                <h2 className="mt-3 text-lg font-semibold text-white">{heading}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{sub}</p>
              </div>
            ))}
          </section>

          <section aria-labelledby="exemple-mauvais-lead" className="mt-12 overflow-hidden rounded-3xl border border-sky-400/20 bg-[#101b2d] p-5 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-300">Exemple concret d'une demande non retenue</p>
            <h2 id="exemple-mauvais-lead" className="mt-2 text-2xl font-bold text-white md:text-3xl">
              Ce n'est pas un mauvais client. C'est un projet qui n'est pas pour vous.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-200 md:text-base">
              Un propriétaire de la Rive-Sud cherche à faire isoler son entretoit avec de la cellulose.
              Il souhaite aussi faire du calfeutrage et appliquer du polyuréthane sur les solives de rive.
              Or, l'entreprise appelée dessert seulement la Rive-Nord, installe de la fibre de verre soufflée
              et n'offre ni calfeutrage ni polyuréthane.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Territoire", "Projet : Rive-Sud", "Entreprise : Rive-Nord seulement"],
                ["Isolant", "Demandé : cellulose", "Offert : fibre de verre soufflée"],
                ["Calfeutrage", "Demandé par le client", "Service non offert"],
                ["Solives de rive", "Demandé : polyuréthane", "Service non offert"],
              ].map(([label, need, gap]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">{label}</p>
                  <p className="mt-2 text-sm text-white">{need}</p>
                  <p className="mt-1 text-sm text-amber-200">{gap}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-lg font-semibold text-white">
              Quatre incompatibilités. Un seul lead payé. Mais un vrai projet pour le bon entrepreneur.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              UNPRO vise à réorienter cette demande vers un professionnel qui dessert le secteur et offre
              les travaux réellement recherchés, plutôt que de proposer au client un matériau ou un service
              qu'il n'a pas demandé. Si un seul entrepreneur ne peut pas tout prendre en charge, Clara
              vérifie d'abord avec le propriétaire s'il souhaite envisager plusieurs spécialistes.
            </p>
            <a href="#echanger" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 underline underline-offset-4">
              Récupérer la valeur de mes demandes non retenues <ArrowRight size={16} />
            </a>
          </section>

          <section id="echanger" className="mt-14 scroll-mt-8 rounded-3xl border border-white/15 bg-[#111c30] p-5 shadow-2xl md:p-8">
            <h2 className="text-2xl font-bold text-white">Échanger un lead</h2>
            <p className="mt-2 text-sm text-slate-300">Créez votre compte entrepreneur, confirmez votre téléphone avec un code et transmettez votre demande.</p>
            <p className="mt-3 text-sm font-medium text-sky-100">
              Les crédits sont réservés aux entrepreneurs ayant un abonnement valide au service Rendez-vous UNPRO.
            </p>
            {canSubmit && hasValidBookingSubscription !== true && (
              <div role="status" className="mt-4 rounded-xl border border-amber-300/25 bg-amber-200/10 p-4 text-sm text-amber-100">
                {hasValidBookingSubscription === false
                  ? "Aucun abonnement Rendez-vous UNPRO valide n'est confirmé pour votre entreprise."
                  : "Impossible de confirmer votre abonnement Rendez-vous UNPRO pour le moment."}
                {" "}Vous pouvez déposer une demande, mais aucun crédit ne pourra être accordé ou utilisé tant que votre abonnement admissible n'est pas valide.
                <a className="mt-2 block font-semibold text-sky-200 underline" href="/entrepreneur/devis-personnalise">
                  Découvrir les forfaits de rendez-vous UNPRO
                </a>
              </div>
            )}
            {isLoading ? <p className="mt-5 flex items-center gap-2 text-slate-200"><Loader2 className="animate-spin" size={18}/> Vérification de votre compte…</p> :
              !isAuthenticated ? (
                <button type="button" onClick={login} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#73c2ff] px-4 py-4 font-bold text-slate-950 md:w-auto">
                  S'inscrire / se connecter par code SMS <ArrowRight size={18}/>
                </button>
              ) : !canSubmit ? (
                <div className="mt-5 rounded-xl bg-amber-200/10 p-4 text-amber-100" role="status">
                  Votre compte doit être associé à un profil entrepreneur pour déposer une demande.
                  <a className="ml-2 underline" href="/role">Choisir « Je suis entrepreneur »</a>.
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>Votre entreprise *
                      <input className={fieldClass} required minLength={2} maxLength={160} autoComplete="organization" value={draft.company_name} onChange={e=>change("company_name",e.target.value)} placeholder="Nom de l'entreprise"/>
                    </label>
                    <label className={labelClass}>Prénom du client *
                      <input className={fieldClass} required maxLength={100} value={draft.client_first_name} onChange={e=>change("client_first_name",e.target.value)} placeholder="Prénom"/>
                    </label>
                    <label className={labelClass}>Nom du client
                      <input className={fieldClass} maxLength={100} value={draft.client_last_name} onChange={e=>change("client_last_name",e.target.value)} placeholder="Nom"/>
                    </label>
                    <label className={labelClass}>Téléphone du client
                      <input className={fieldClass} type="tel" autoComplete="off" value={draft.client_phone} onChange={e=>change("client_phone",e.target.value)} placeholder="(450) 555-0000"/>
                    </label>
                    <label className={labelClass}>Courriel du client
                      <input className={fieldClass} type="email" autoComplete="off" value={draft.client_email} onChange={e=>change("client_email",e.target.value)} placeholder="client@exemple.ca"/>
                    </label>
                    <label className={labelClass}>Ville du projet *
                      <input className={fieldClass} required maxLength={120} value={draft.client_city} onChange={e=>change("client_city",e.target.value)} placeholder="Terrebonne"/>
                    </label>
                    <label className={labelClass}>Service demandé *
                      <input className={fieldClass} required minLength={2} maxLength={150} value={draft.service_requested} onChange={e=>change("service_requested",e.target.value)} placeholder="Ex. Isolation entretoit cellulose + calfeutrage + polyuréthane"/>
                    </label>
                    <label className={labelClass}>Pourquoi ce lead n'était pas pour vous? *
                      <select className={fieldClass} value={draft.mismatch_reason} onChange={e=>change("mismatch_reason",e.target.value)}>
                        {REASONS.map(([v,t])=><option key={v} value={v}>{t}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>Source de la demande *
                      <input className={fieldClass} required minLength={2} maxLength={100} value={draft.acquisition_source} onChange={e=>change("acquisition_source",e.target.value)} placeholder="Google Ads, Facebook, site Web…"/>
                    </label>
                    <label className={labelClass}>Coût payé pour ce lead (CAD, si connu)
                      <input className={fieldClass} type="number" step="0.01" min="0" max="100000" inputMode="decimal" value={draft.acquisition_cost} onChange={e=>change("acquisition_cost",e.target.value)} placeholder="Ex. 42,50 $"/>
                    </label>
                    <label className={labelClass}>Échéance du projet
                      <select className={fieldClass} value={draft.project_timeline} onChange={e=>change("project_timeline",e.target.value)}>
                        <option value="urgent">Urgent</option><option value="soon">Dans le mois</option><option value="flexible">Flexible</option>
                      </select>
                    </label>
                  </div>
                  <label className={labelClass}>Décrivez le besoin du client *
                    <textarea className={fieldClass} required minLength={5} maxLength={4000} rows={3} value={draft.project_description} onChange={e=>change("project_description",e.target.value)} placeholder="Précisez tous les travaux, matériaux demandés et contraintes. Ex. entretoit en cellulose, calfeutrage, polyuréthane sur solives de rive, Rive-Sud."/>
                  </label>
                  <div>
                    <label className={labelClass} htmlFor="lead-files">Téléverser un fichier (facultatif)</label>
                    <p className="mt-1 text-xs text-slate-400">Soumission, demande reçue ou preuve de coût. PDF, JPG, PNG, WebP. Maximum 3 fichiers de 10 Mo.</p>
                    <select className={fieldClass} aria-label="Type de pièce jointe" value={fileKind} onChange={e=>setFileKind(e.target.value as typeof fileKind)}>
                      <option value="client_request">Demande du client</option><option value="quote">Soumission</option><option value="acquisition_receipt">Justificatif de coût</option>
                    </select>
                    <input id="lead-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={e=>chooseFiles(e.target.files)}
                      className="mt-3 block w-full rounded-xl border border-dashed border-sky-400/30 bg-white/5 px-4 py-5 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-sky-200 file:px-3 file:py-2 file:text-slate-950"/>
                    {files.length > 0 && <p className="mt-2 flex items-center gap-2 text-xs text-sky-200"><FileUp size={14}/>{files.length} fichier(s) sélectionné(s)</p>}
                  </div>
                  <label className={labelClass}>Comment le client vous a-t-il autorisé à transmettre ses coordonnées et documents à UNPRO? *
                    <textarea className={fieldClass} rows={2} required minLength={8} maxLength={2000} value={draft.consent_provenance}
                      onChange={e=>change("consent_provenance",e.target.value)} placeholder="Ex. Client informé et consentant par courriel le 30 octobre, preuve conservée."/>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-slate-200">
                    <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-sky-400"/>
                    <span>Je confirme avoir l'autorisation appropriée du client pour transmettre les renseignements et fichiers saisis à UNPRO afin de rechercher un entrepreneur pour ce projet. *</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm text-slate-200">
                    <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-1 h-5 w-5 accent-sky-400"/>
                    <span>J'accepte les <a href="#conditions-rachat" className="text-sky-300 underline">conditions du programme</a>. *</span>
                  </label>
                  <p className="text-xs text-slate-400">Sans l'autorisation du propriétaire, invitez-le plutôt à présenter lui-même son projet à <a href="/" className="underline">Clara</a>. Ne téléversez aucun de ses renseignements dans ce cas.</p>
                  <button type="submit" disabled={busy || !consent || !termsAccepted}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#73c2ff] px-4 py-4 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? <><Loader2 size={18} className="animate-spin"/> Enregistrement…</> : <><ShieldCheck size={18}/> Soumettre pour vérification</>}
                  </button>
                  {feedback && <p role="status" aria-live="polite" className="rounded-xl bg-white/10 p-4 text-sm text-slate-100">{feedback}</p>}
                </form>
              )}
          </section>

          {canSubmit && (
            <section className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-white/15 bg-[#111c30] p-5 md:p-7">
                <h2 className="text-2xl font-bold text-white">Mes demandes</h2>
                {submissions.length === 0 ? <p className="mt-4 text-slate-300">Aucune demande enregistrée pour le moment.</p> :
                  <div className="mt-4 space-y-3">{submissions.map(item => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2"><strong className="text-white">{item.service_requested} — {item.client_city}</strong>
                        <span className="text-sky-200">{item.status === "pending" ? "À vérifier" : item.status === "approved" ? "Approuvée" : item.status === "rejected" ? "Refusée" : "Retirée"}</span></div>
                      <p className="mt-1 text-slate-300">Dossier {item.id.slice(0, 8).toUpperCase()} · {item.client_first_name}</p>
                      {item.status === "approved" && item.approved_credit_cents > 0 && (
                        <p className="mt-2 font-semibold text-emerald-300">
                          Crédit validé : {money(item.approved_credit_cents)}
                          {hasValidBookingSubscription !== true && (
                            <span className="block text-xs font-normal text-amber-100">
                              Utilisation suspendue : abonnement Rendez-vous UNPRO valide requis.
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}</div>}
              </div>
              <div className="rounded-3xl border border-white/15 bg-[#111c30] p-5 md:p-7">
                <h2 className="text-2xl font-bold text-white">Recevoir des offres adaptées</h2>
                <p className="mt-2 text-sm text-slate-300">Dites à Clara quels projets vous intéressent vraiment. Vous gardez le contrôle des notifications.</p>
                <form onSubmit={savePrefs} className="mt-5 space-y-4">
                  <label className={labelClass}>Mes services
                    <input className={fieldClass} value={prefs.services} onChange={e=>setPrefs(p=>({...p,services:e.target.value}))} placeholder="Ex. Isolation d'entretoit, calfeutrage"/>
                  </label>
                  <label className={labelClass}>Mon territoire
                    <input className={fieldClass} value={prefs.territory} onChange={e=>setPrefs(p=>({...p,territory:e.target.value}))} placeholder="Ex. Laval, Terrebonne"/>
                  </label>
                  <label className={labelClass}>Mes disponibilités
                    <input className={fieldClass} value={prefs.preferred_hours} onChange={e=>setPrefs(p=>({...p,preferred_hours:e.target.value}))} placeholder="Ex. Mardi à jeudi après-midi"/>
                  </label>
                  <label className="flex gap-3 text-sm text-slate-200"><input type="checkbox" className="h-5 w-5 accent-sky-400" checked={prefs.sms_opt_in} onChange={e=>setPrefs(p=>({...p,sms_opt_in:e.target.checked}))}/> J'accepte de recevoir des offres par SMS.</label>
                  <label className="flex gap-3 text-sm text-slate-200"><input type="checkbox" className="h-5 w-5 accent-sky-400" checked={prefs.email_opt_in} onChange={e=>setPrefs(p=>({...p,email_opt_in:e.target.checked}))}/> J'accepte de recevoir des offres par courriel.</label>
                  <button disabled={savingPrefs} type="submit" className="w-full rounded-xl border border-sky-400/60 px-4 py-3 font-semibold text-sky-200 hover:bg-sky-400/10 disabled:opacity-50">Enregistrer mes préférences</button>
                  <p className="text-xs text-slate-400">Vous pouvez retirer votre accord à tout moment en décochant les canaux et en enregistrant.</p>
                  {prefFeedback && <p role="status" className="text-sm text-sky-100">{prefFeedback}</p>}
                </form>
              </div>
            </section>
          )}

          <section className="mt-14 max-w-3xl">
            <h2 className="text-2xl font-semibold">Questions fréquentes</h2>
            {[
              ["Quels leads puis-je échanger?", "Les demandes réelles qui ne correspondent pas à vos services, à votre territoire ou à vos disponibilités, et pour lesquelles la transmission est autorisée."],
              ["Comment est déterminée la valeur?", "La valeur est évaluée selon le coût d'acquisition documenté et les modalités du programme. Une demande sans preuve de coût est évaluée séparément."],
              ["Est-ce que mes crédits garantissent un rendez-vous?", "Non. Les crédits accordés peuvent être utilisés pour des services admissibles selon les disponibilités et les conditions affichées."],
              ["Dois-je avoir l'accord du client?", "Oui. Le propriétaire doit autoriser la transmission de ses informations et demeurer libre de poursuivre ou non son projet avec Clara."],
            ].map(([q,a]) => <details key={q} className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-slate-300">{a}</p></details>)}
            <details id="conditions-rachat" className="mt-8 rounded-xl border border-sky-400/30 bg-[#111c30] px-5 py-4">
              <summary className="cursor-pointer font-semibold text-sky-200">Conditions du programme de rachat de leads</summary>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                <p>Le rachat s'effectue sous forme de crédits de services UNPRO et non de paiement en argent. Chaque demande est examinée avant acceptation et attribution.</p>
                <p>Pour une demande achetée, le crédit correspond à sa valeur d'acquisition prouvée en dollars canadiens, hors taxes récupérables. Les coûts groupés et les demandes sans coût documenté nécessitent une méthode ou un barème accepté avant attribution. Aucun crédit n'est émis automatiquement au dépôt.</p>
                <p>La transmission de coordonnées et de pièces exige l'autorisation valable du propriétaire. Sans cette autorisation, ne transmettez pas les données : dirigez plutôt le propriétaire vers Clara pour qu'il s'inscrive lui-même.</p>
                <p>Pour bénéficier des crédits, l'entreprise doit être titulaire d'un abonnement payant actif et valide au service de rendez-vous UNPRO, incluant un droit aux rendez-vous. L'inscription seule, l'activation du profil à 350 $ et un abonnement Présence IA sans rendez-vous ne suffisent pas. Une demande peut être soumise avant abonnement, mais les crédits ne sont accordés qu'après validation de ce droit. Si l'abonnement expire, est résilié ou remboursé, l'utilisation des crédits est suspendue jusqu'au rétablissement d'un abonnement admissible.</p>
                <p>Les crédits n'offrent pas d'accès garanti à un rendez-vous; toute utilisation exige une offre réelle, qualifiée, compatible et disponible. Les crédits ne constituent pas un paiement Stripe et ne remplacent pas automatiquement l'activation UNPRO à 350 $ + taxes applicables.</p>
                <p>Les doublons, les demandes fictives, les coûts invérifiables ou les dossiers sans consentement suffisant peuvent être refusés. La confidentialité des données, les modalités d'expiration, les litiges et les retraits font partie du règlement complet à approuver avant tout lancement du programme.</p>
              </div>
            </details>
          </section>
          <p className="mt-10 flex items-center gap-2 text-sm text-slate-400"><Check size={16}/> UNPRO — Les bons projets. Aux bons professionnels.</p>
        </main>
      </div>
    </MainLayout>
  );
}
