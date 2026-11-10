/**
 * /entrepreneurs/realisations — « Montrez vos réalisations » (palier gratuit V1).
 * Saisie possible sans compte; sauvegarde seulement après connexion vérifiée.
 * Le serveur applique le plafond de 10, la propriété et la modération humaine.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/ui/LanguageToggle";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { useAuthSession } from "@/stores/authSessionStore";
import { supabase } from "@/integrations/supabase/client";
import { saveReturnPath } from "@/lib/authReturn";
import { saveRoleIntent } from "@/services/auth/roleIntent";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  blobToDataUrl, clearDraftLocally, dataUrlToBlob, emptyDraft, fetchMyQuota, FREE_PORTFOLIO_LIMIT,
  FREE_PORTFOLIO_PATH, MAX_PHOTOS, portfolioErrorMessage, quotaLabel, readDraftLocally, sanitizeImage,
  saveDraftLocally, submitPortfolio, uploadPhotos, validateDraft, type DraftField, type FreeQuota, type PortfolioDraft,
} from "@/lib/portfolio/freePortfolio";

interface Photo { blob: Blob; url: string }
interface MyProject { id: string; title: string; status: string; service_name: string | null; city: string | null; review_reason: string | null; created_at: string }

const STATUS_LABEL: Record<string, { fr: string; en: string }> = {
  pending: { fr: "En attente de modération", en: "Awaiting review" },
  approved: { fr: "Approuvée et affichée", en: "Approved and shown" },
  rejected: { fr: "Non retenue", en: "Not accepted" },
  withdrawn: { fr: "Retirée", en: "Withdrawn" },
};

export default function PageFreePortfolio() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const L = (f: string, e: string) => (fr ? f : e);
  const navigate = useNavigate();
  const { session } = useAuthSession();
  const user = session?.user ?? null;

  const restored = useMemo(() => readDraftLocally(), []);
  const [draft, setDraft] = useState<PortfolioDraft>(() => restored?.draft ?? emptyDraft());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploadedFor, setUploadedFor] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [errors, setErrors] = useState<DraftField[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "photos" | "uploading" | "submitting">("idle");
  const [needAuth, setNeedAuth] = useState(false);
  const [done, setDone] = useState<{ status: string } | null>(null);
  const [quota, setQuota] = useState<FreeQuota | null>(null);
  const [mine, setMine] = useState<MyProject[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const startedRef = useRef(false);
  const pendingSubmitRef = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Restaure les photos du brouillon (reprise après connexion par lien/Google).
  useEffect(() => {
    if (!restored?.photos.length) return;
    void Promise.all(restored.photos.map(async (url) => ({ blob: await dataUrlToBlob(url), url }))).then(setPhotos).catch(() => undefined);
  }, [restored]);

  const refresh = useCallback(async () => {
    if (!user) { setQuota(null); setMine([]); return; }
    try {
      const q = await fetchMyQuota();
      setQuota(q);
      if (q.contractor_id) {
        const { data } = await supabase.from("contractor_portfolio_projects")
          .select("id,title,status,service_name,city,review_reason,created_at")
          .eq("contractor_id", q.contractor_id).order("created_at", { ascending: false }).limit(20);
        setMine((data ?? []) as MyProject[]);
      }
    } catch { /* l'état précédent reste affiché */ }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);

  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    void logFunnelEvent({ event_type: "project_form_started", step: "free_portfolio", dedupe_key: `project_form_started:${draft.clientRequestId}` });
  };
  const set = <K extends keyof PortfolioDraft>(k: K, v: PortfolioDraft[K]) => { markStarted(); setDraft((d) => ({ ...d, [k]: v })); };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    markStarted();
    setServerError(null);
    setBusy("photos");
    const next: Photo[] = [];
    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const blob = await sanitizeImage(file);
        next.push({ blob, url: await blobToDataUrl(blob) });
      } catch (e) {
        setServerError(String((e as Error).message).includes("unsupported")
          ? L("Format non pris en charge : utilisez JPEG, PNG ou WebP.", "Unsupported format: use JPEG, PNG or WebP.")
          : L("Cette photo n’a pas pu être préparée (trop lourde?).", "This photo could not be prepared (too large?)."));
      }
    }
    setPhotos((p) => [...p, ...next].slice(0, MAX_PHOTOS));
    invalidateUpload();
    setBusy("idle");
  };
  // Photos changées après un envoi : nouveaux chemins, jamais un ancien fichier réutilisé.
  const invalidateUpload = () => {
    setUploadedFor(null);
    if (uploadedPaths.length) {
      setUploadedPaths([]);
      setDraft((d) => ({ ...d, clientRequestId: crypto.randomUUID() }));
    }
  };
  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, j) => j !== i));
    invalidateUpload();
    setDraft((d) => ({ ...d, beforeIndex: d.beforeIndex === i ? null : d.beforeIndex, afterIndex: d.afterIndex === i ? null : d.afterIndex }));
  };

  const needsBusiness = !user || !quota?.contractor_id;
  const used = quota?.used ?? 0;
  const atLimit = !!user && used >= FREE_PORTFOLIO_LIMIT;

  const submit = useCallback(async () => {
    if (honeypot) return; // robot : aucun envoi
    const errs = validateDraft(draft, photos.length, needsBusiness);
    setErrors(errs);
    setServerError(null);
    if (errs.length) return;
    if (!user) {
      pendingSubmitRef.current = true;
      saveDraftLocally(draft, photos.map((p) => p.url));
      setNeedAuth(true);
      return;
    }
    try {
      // Le jeu de photos change → nouvel identifiant de requête (idempotence honnête).
      const fingerprint = photos.map((p) => p.url.length).join(",");
      let paths = uploadedPaths;
      if (uploadedFor !== fingerprint) {
        setBusy("uploading");
        paths = await uploadPhotos(user.id, draft.clientRequestId, photos.map((p) => p.blob));
        setUploadedPaths(paths);
        setUploadedFor(fingerprint);
      }
      setBusy("submitting");
      const res = await submitPortfolio(draft, paths);
      clearDraftLocally();
      setDone({ status: res.status });
      setPhotos([]);
      setUploadedFor(null);
      setUploadedPaths([]);
      setDraft((d) => ({ ...emptyDraft(), businessName: d.businessName, contactEmail: d.contactEmail, contactPhone: d.contactPhone }));
      startedRef.current = false;
      await refresh();
    } catch (e) {
      saveDraftLocally(draft, photos.map((p) => p.url));
      setServerError(portfolioErrorMessage(e, fr ? "fr" : "en"));
    } finally {
      setBusy("idle");
    }
  }, [draft, photos, needsBusiness, user, uploadedFor, uploadedPaths, refresh, fr, honeypot]);

  // Reprise automatique après une connexion par SMS sur cette page.
  useEffect(() => {
    if (user && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      setNeedAuth(false);
      void logFunnelEvent({ event_type: "minimal_account_created", step: "free_portfolio", dedupe_key: `minimal_account_created:${user.id}` });
      void submit();
    }
  }, [user, submit]);

  const goOtherLogin = () => {
    saveDraftLocally(draft, photos.map((p) => p.url));
    saveReturnPath(FREE_PORTFOLIO_PATH, "contractor_onboarding");
    saveRoleIntent("contractor", { returnPath: FREE_PORTFOLIO_PATH, businessName: draft.businessName.trim() || undefined });
    navigate("/login");
  };

  const withdraw = async (id: string) => {
    const { error } = await supabase.rpc("withdraw_portfolio_project" as never, { p_id: id } as never);
    if (error) setServerError(portfolioErrorMessage(error, fr ? "fr" : "en"));
    await refresh();
  };

  const fieldErr = (f: DraftField) => errors.includes(f);
  const errCls = (f: DraftField) => (fieldErr(f) ? "border-destructive" : "");
  const approved = quota?.approved ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{L("Publiez vos réalisations gratuitement | UNPRO", "Publish your projects for free | UNPRO")}</title>
        <meta name="description" content={L("Montrez vos vrais projets aux propriétaires du Québec : jusqu’à 10 réalisations gratuites, vérifiées avant affichage.", "Show your real projects to Quebec homeowners: up to 10 free projects, reviewed before display.")} />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/realisations" />
      </Helmet>

      <main className="mx-auto max-w-xl px-5 py-8">
        <Link to="/entrepreneurs" className="text-sm text-muted-foreground hover:text-foreground">← {L("Espace entrepreneurs", "Contractors")}</Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{L("Montrez vos réalisations", "Show your projects")}</h1>
        <p className="mt-2 text-base text-muted-foreground">{L("Vos vraies photos inspirent les propriétaires. Gratuit, jusqu’à 10 projets; chaque projet est vérifié par notre équipe avant d’être affiché.", "Your real photos inspire homeowners. Free, up to 10 projects; each one is reviewed by our team before it appears.")}</p>
        {user && quota && <p className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium" aria-live="polite">{quotaLabel(used, fr ? "fr" : "en")}</p>}

        {approved > 0 && (
          <section className="mt-6 rounded-[28px] border border-primary/30 bg-primary/5 p-5">
            <h2 className="text-lg font-semibold">{L("Merci! Votre réalisation est affichée.", "Thank you! Your project is live.")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{L(`${approved} réalisation${approved > 1 ? "s" : ""} approuvée${approved > 1 ? "s" : ""} parmi les projets récents présentés aux propriétaires sur UNPRO.`, `${approved} approved project${approved > 1 ? "s" : ""} among the recent projects shown to homeowners on UNPRO.`)}</p>
            <p className="mt-3 text-sm">{L("Pour aller plus loin : profil entreprise complet et 12 mois de présence IA sur UNPRO. Paiement unique, aucun abonnement.", "Go further: a complete business profile and 12 months of AI presence on UNPRO. One-time payment, no subscription.")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="min-h-12 whitespace-normal">
                <Link to="/entrepreneurs/activation-350?activate=1" onClick={() => void logFunnelEvent({ event_type: "activation_checkout_started", step: "free_portfolio", contractor_id: quota?.contractor_id ?? null, dedupe_key: `activation_checkout_started:portfolio:${quota?.contractor_id ?? "none"}` })}>
                  {L("Activer mon profil et ma présence IA — 350 $ + taxes", "Activate my profile and AI presence — $350 + taxes")}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="min-h-11 whitespace-normal">
                <Link to="/entrepreneur/devis-personnalise" onClick={() => void logFunnelEvent({ event_type: "appointment_plan_interest", step: "free_portfolio", contractor_id: quota?.contractor_id ?? null, dedupe_key: `appointment_plan_interest:portfolio:${quota?.contractor_id ?? "none"}` })}>
                  {L("Je veux aussi des rendez-vous exclusifs (devis distinct)", "I also want exclusive appointments (separate quote)")}
                </Link>
              </Button>
            </div>
          </section>
        )}

        {done && (
          <div role="status" className="mt-6 flex gap-3 rounded-[28px] border border-border bg-card p-5">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">{L("Merci! Votre réalisation est bien reçue.", "Thank you! Your project was received.")}</p>
              <p className="text-sm text-muted-foreground">{L("Elle est en attente de modération et ne sera affichée qu’après approbation.", "It is awaiting review and will only appear once approved.")}</p>
              <Button variant="link" className="h-auto p-0" onClick={() => setDone(null)}>{L("Ajouter un autre projet", "Add another project")}</Button>
            </div>
          </div>
        )}

        {atLimit && <p role="status" className="mt-6 rounded-[28px] border border-border bg-card p-5 text-sm">{L("Vous avez atteint vos 10 projets gratuits. Retirez un projet pour en ajouter un autre.", "You have reached your 10 free projects. Withdraw one to add another.")}</p>}

        {!done && !atLimit && (
          <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <fieldset>
              <legend className="text-sm font-semibold">{L("Photos (1 à 4)", "Photos (1 to 4)")}</legend>
              <p className="text-xs text-muted-foreground">{L("Évitez visages, plaques et adresses visibles. La localisation des photos est retirée automatiquement.", "Avoid faces, licence plates and visible addresses. Photo location data is removed automatically.")}</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {photos.map((p, i) => (
                  <div key={p.url.slice(-24) + i} className="relative overflow-hidden rounded-2xl border border-border">
                    <img src={p.url} alt={L(`Photo ${i + 1}`, `Photo ${i + 1}`)} className="aspect-square w-full object-cover" />
                    <div className="flex gap-1 bg-card p-1.5 text-xs">
                      <button type="button" aria-pressed={draft.beforeIndex === i} onClick={() => set("beforeIndex", draft.beforeIndex === i ? null : i)} className={`min-h-9 flex-1 rounded-lg ${draft.beforeIndex === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{L("Avant", "Before")}</button>
                      <button type="button" aria-pressed={draft.afterIndex === i} onClick={() => set("afterIndex", draft.afterIndex === i ? null : i)} className={`min-h-9 flex-1 rounded-lg ${draft.afterIndex === i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{L("Après", "After")}</button>
                      <button type="button" onClick={() => removePhoto(i)} aria-label={L("Retirer la photo", "Remove photo")} className="min-h-9 rounded-lg bg-muted px-2"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              {photos.length < MAX_PHOTOS && (
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={() => cameraRef.current?.click()} disabled={busy !== "idle"}><Camera className="mr-2 h-4 w-4" />{L("Prendre", "Take")}</Button>
                  <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={() => galleryRef.current?.click()} disabled={busy !== "idle"}><ImagePlus className="mr-2 h-4 w-4" />{L("Choisir", "Choose")}</Button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-label={L("Choisir des photos", "Choose photos")} onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
              {busy === "photos" && <p className="mt-2 text-sm text-muted-foreground">{L("Préparation des photos…", "Preparing photos…")}</p>}
              {fieldErr("photos") && <p className="mt-1 text-sm text-destructive">{L("Ajoutez au moins une photo.", "Add at least one photo.")}</p>}
            </fieldset>

            <label className="block text-sm font-semibold">{L("Titre du projet", "Project title")}
              <Input className={`mt-1 min-h-12 ${errCls("title")}`} value={draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder={L("Ex. Réfection de toiture en bardeaux", "E.g. Shingle roof replacement")} />
            </label>
            <label className="block text-sm font-semibold">{L("Type de travaux", "Type of work")}
              <Input className={`mt-1 min-h-12 ${errCls("serviceName")}`} value={draft.serviceName} maxLength={80} onChange={(e) => set("serviceName", e.target.value)} placeholder={L("Ex. Toiture", "E.g. Roofing")} />
            </label>
            <label className="block text-sm font-semibold">{L("Ville (approximative)", "City (approximate)")}
              <Input className={`mt-1 min-h-12 ${errCls("city")}`} value={draft.city} maxLength={80} onChange={(e) => set("city", e.target.value)} placeholder={L("Ex. Laval", "E.g. Laval")} />
              {fieldErr("city") && <span className="mt-1 block text-sm font-normal text-destructive">{L("Ville seulement, sans adresse ni code postal.", "City only, no address or postal code.")}</span>}
            </label>
            <label className="block text-sm font-semibold">{L("Commentaire (facultatif)", "Comment (optional)")}
              <Textarea className={`mt-1 ${errCls("description")}`} value={draft.description} maxLength={600} rows={3} onChange={(e) => set("description", e.target.value)} />
            </label>

            {needsBusiness && (
              <fieldset className="space-y-3 rounded-[28px] border border-border p-4">
                <legend className="px-1 text-sm font-semibold">{L("Votre entreprise", "Your business")}</legend>
                <Input aria-label={L("Nom de l’entreprise", "Business name")} className={`min-h-12 ${errCls("business")}`} value={draft.businessName} maxLength={120} onChange={(e) => set("businessName", e.target.value)} placeholder={L("Nom de l’entreprise", "Business name")} />
                <Input aria-label={L("Courriel de l’entreprise", "Business email")} type="email" inputMode="email" className={`min-h-12 ${errCls("contact")}`} value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder={L("Courriel de l’entreprise", "Business email")} />
                <Input aria-label={L("Téléphone de l’entreprise", "Business phone")} type="tel" inputMode="tel" className={`min-h-12 ${errCls("contact")}`} value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder={L("ou téléphone", "or phone")} />
                {fieldErr("contact") && <p className="text-sm text-destructive">{L("Indiquez un courriel ou un téléphone valide.", "Enter a valid email or phone.")}</p>}
              </fieldset>
            )}

            <div className="hidden" aria-hidden="true">
              <label>Site web<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
            </div>

            <label className={`flex gap-3 text-sm ${fieldErr("photoRights") ? "text-destructive" : ""}`}>
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={draft.photoRights} onChange={(e) => set("photoRights", e.target.checked)} />
              <span>{L("Ces photos montrent un projet réalisé par mon entreprise. J’ai le droit de les publier (et l’accord des personnes visibles, le cas échéant). J’autorise UNPRO à les afficher et je peux les retirer en tout temps.", "These photos show a project completed by my business. I have the right to publish them (and consent from anyone visible). I authorize UNPRO to display them and can withdraw them at any time.")}</span>
            </label>
            <label className="flex gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={draft.showCompanyName} onChange={(e) => set("showCompanyName", e.target.checked)} />
              <span>{L("Afficher le nom de mon entreprise avec ce projet", "Show my business name with this project")}</span>
            </label>

            {serverError && (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive">
                <span>{serverError}</span>
                <Button type="submit" variant="outline" size="sm" className="min-h-10"><RefreshCw className="mr-1 h-4 w-4" />{L("Réessayer", "Retry")}</Button>
              </div>
            )}

            {needAuth && !user ? (
              <section className="space-y-3 rounded-[28px] border border-primary/30 p-4" aria-live="polite">
                <p className="text-sm font-semibold">{L("Dernière étape : confirmez votre téléphone pour enregistrer votre projet.", "Last step: confirm your phone to save your project.")}</p>
                <p className="text-xs text-muted-foreground">{L("Votre saisie est conservée. Aucun paiement.", "Your entry is kept. No payment.")}</p>
                <PhoneOtpForm />
                <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={goOtherLogin}>{L("Continuer par courriel ou Google", "Continue with email or Google")}</Button>
              </section>
            ) : (
              <Button type="submit" className="min-h-12 w-full" disabled={busy !== "idle"}>
                {busy === "uploading" || busy === "submitting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busy === "uploading" ? L("Envoi des photos…", "Uploading photos…") : L("Enregistrement…", "Saving…")}</> : L("Envoyer pour modération", "Submit for review")}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">{L("Gratuit. Ne garantit aucune demande ni visibilité externe. Les qualifications (licence, assurances) sont vérifiées séparément.", "Free. No guaranteed requests or external visibility. Qualifications (licence, insurance) are verified separately.")}</p>
          </form>
        )}

        {mine.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">{L("Mes réalisations", "My projects")}</h2>
            <ul className="mt-3 space-y-2">
              {mine.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABEL[m.status]?.[fr ? "fr" : "en"] ?? m.status}{m.status === "rejected" && m.review_reason ? ` — ${m.review_reason}` : ""}</p>
                  </div>
                  {(m.status === "pending" || m.status === "approved") && (
                    <Button variant="outline" size="sm" className="min-h-10 shrink-0" onClick={() => void withdraw(m.id)}>{L("Retirer", "Withdraw")}</Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
