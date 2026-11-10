/**
 * /entrepreneurs/realisations — landing de conversion « Montrez vos réalisations ».
 *
 * Ordre strict : photos (sans compte, gardées sur l'appareil) → compte UNPRO
 * existant (SMS, courriel, Google) → fiche + projet (soumission réelle via
 * `submit_portfolio_project`, en attente de modération) → mandats recherchés
 * (facultatif, profil de matching canonique) → merci + offre 350 $ secondaire.
 * Le serveur reste l'autorité : plafond 10, propriété, modération, paiement.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, Loader2, RefreshCw, Replace, ShieldCheck, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/ui/LanguageToggle";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import PortfolioShowcase from "@/components/portfolio/PortfolioShowcase";
import PortfolioMandates from "@/components/portfolio/PortfolioMandates";
import PortfolioUpgradeCard from "@/components/portfolio/PortfolioUpgradeCard";
import { useAuthSession } from "@/stores/authSessionStore";
import { supabase } from "@/integrations/supabase/client";
import { saveReturnPath } from "@/lib/authReturn";
import { saveRoleIntent } from "@/services/auth/roleIntent";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  emptyDraft, fetchMyQuota, FREE_PORTFOLIO_LIMIT, FREE_PORTFOLIO_PATH, MAX_PHOTOS, portfolioErrorMessage, quotaLabel, sanitizeImage,
  PORTFOLIO_STATUS_LABEL, setProjectCompletion, submitPortfolio, uploadPhotos, validateDraft, type DraftField, type FreeQuota, type PortfolioDraft,
} from "@/lib/portfolio/freePortfolio";
import { clearDraft, loadDraft, persistDraft } from "@/lib/portfolio/draftStore";
import {
  clearLastSubmission, moveItem, parseStep, PROGRESS_STEPS, progressIndex, readLastSubmission, remapIndexAfterMove, remapIndexAfterRemove,
  resolveStep, saveLastSubmission, stepAfterPhotos, suggestService, photoKindOf, withPhotoKind, type FlowStep, type LastSubmission, type PhotoKind,
} from "@/lib/portfolio/portfolioFlow";

interface Photo { blob: Blob; url: string }
interface MyProject { id: string; title: string; status: string; review_reason: string | null }
interface KnownContractor { business_name: string | null; city: string | null; specialty: string | null }

const AUTH_FLAG = "unpro_portfolio_auth_started";
const STATUS_LABEL = PORTFOLIO_STATUS_LABEL;
const STEP_LABEL: Record<string, { fr: string; en: string }> = {
  photos: { fr: "Photos", en: "Photos" }, compte: { fr: "Compte", en: "Account" }, projet: { fr: "Projet", en: "Project" },
  mandats: { fr: "Mandats", en: "Jobs" }, merci: { fr: "Terminé", en: "Done" },
};

const toPhoto = (blob: Blob): Photo => ({ blob, url: URL.createObjectURL(blob) });

function Progress({ step, fr }: { step: FlowStep; fr: boolean }) {
  const idx = progressIndex(step);
  if (idx < 0) return null;
  return (
    <div className="mt-4" aria-label={fr ? `Étape ${idx + 1} sur ${PROGRESS_STEPS.length}` : `Step ${idx + 1} of ${PROGRESS_STEPS.length}`}>
      <div className="flex gap-1.5" aria-hidden="true">
        {PROGRESS_STEPS.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />)}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{fr ? `Étape ${idx + 1}/${PROGRESS_STEPS.length}` : `Step ${idx + 1}/${PROGRESS_STEPS.length}`} · {STEP_LABEL[step]?.[fr ? "fr" : "en"]}</p>
    </div>
  );
}

export default function PageFreePortfolio() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const L = (f: string, e: string) => (fr ? f : e);
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { session, loading: authLoading } = useAuthSession();
  const user = session?.user ?? null;

  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<PortfolioDraft>(() => emptyDraft());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosVersion, setPhotosVersion] = useState(0);
  const uploadedRef = useRef<{ version: number; paths: string[] } | null>(null);
  const [errors, setErrors] = useState<DraftField[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "photos" | "uploading" | "submitting">("idle");
  const [quota, setQuota] = useState<FreeQuota | null>(null);
  const [known, setKnown] = useState<KnownContractor | null>(null);
  const [mine, setMine] = useState<MyProject[]>([]);
  const [last, setLast] = useState<LastSubmission | null>(() => readLastSubmission());
  const [showDetail, setShowDetail] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);
  const goPhotosAfterPick = useRef(false);

  // ---- Étape (dans l'URL : le bouton retour Android revient à l'étape précédente)
  const requested = parseStep(sp.get("etape"));
  const step = resolveStep(requested, { photoCount: photos.length, signedIn: !!user, submitted: !!last });
  const settled = ready && !authLoading;
  const goStep = useCallback((s: FlowStep, replace = false) => {
    setSp(s === "intro" ? {} : { etape: s }, { replace });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [setSp]);
  useEffect(() => { if (settled && step !== requested) goStep(step, true); }, [settled, step, requested, goStep]);

  // ---- Brouillon local : chargé une fois, enregistré à chaque changement
  useEffect(() => {
    let alive = true;
    void loadDraft().then((d) => {
      if (!alive) return;
      if (d) { setDraft(d.draft); setPhotos(d.photos.map(toPhoto)); }
      setReady(true);
    }).catch(() => setReady(true));
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready || !photos.length) return;
    void persistDraft(draft, photos.map((p) => p.blob)).then((ok) => {
      setPhotoNotice(ok ? null : L("Vos photos n’ont pas pu être gardées sur cet appareil : gardez cette page ouverte pendant la connexion.", "Your photos could not be kept on this device: keep this page open while signing in."));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, draft, photosVersion]);
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // ---- Compte connu : quota serveur + fiche existante (préremplissage)
  const refresh = useCallback(async () => {
    if (!user) { setQuota(null); setKnown(null); setMine([]); return; }
    try {
      const q = await fetchMyQuota();
      setQuota(q);
      if (q.contractor_id) {
        const [{ data: c }, { data: list }] = await Promise.all([
          supabase.from("contractors").select("business_name,city,specialty").eq("id", q.contractor_id).maybeSingle(),
          supabase.from("contractor_portfolio_projects").select("id,title,status,review_reason")
            .eq("contractor_id", q.contractor_id).order("created_at", { ascending: false }).limit(20),
        ]);
        setKnown((c ?? null) as KnownContractor | null);
        setMine((list ?? []) as MyProject[]);
      }
    } catch { /* l'état précédent reste affiché */ }
  }, [user]);
  useEffect(() => { void refresh(); }, [refresh]);

  // Préremplit sans jamais écraser ce que le pro a déjà tapé.
  useEffect(() => {
    if (!user || !ready) return;
    setDraft((d) => ({
      ...d,
      contactEmail: d.contactEmail || user.email || "",
      contactPhone: d.contactPhone || user.phone || "",
      serviceName: d.serviceName || known?.specialty || "",
      city: d.city || known?.city || "",
    }));
  }, [user, known, ready]);

  // Connexion terminée (SMS ici, ou retour courriel/Google) → reprise exacte.
  useEffect(() => {
    if (!user) return;
    let started = false;
    try { started = sessionStorage.getItem(AUTH_FLAG) === "1"; sessionStorage.removeItem(AUTH_FLAG); } catch { /* noop */ }
    if (started) void logFunnelEvent({ event_type: "auth_completed", step: "free_portfolio", dedupe_key: `auth_completed:portfolio:${user.id}` });
  }, [user]);

  const set = <K extends keyof PortfolioDraft>(k: K, v: PortfolioDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setKind = (i: number, kind: PhotoKind) => {
    setDraft((d) => withPhotoKind(d, i, kind));
    void logFunnelEvent({ event_type: "photo_type_set", step: "free_portfolio", metadata: { kind, index: i }, dedupe_key: `photo_type_set:${draft.clientRequestId}:${i}:${kind}` });
  };
  const [cmYear, cmMonth] = (draft.completedMonth || "-").split("-");
  // Mois seul ou année seule → valeur incomplète refusée à l'envoi (jamais complétée à notre place).
  const setCompletion = (year: string, month: string) => set("completedMonth", year || month ? `${year}-${month}` : "");
  const yearOptions = useMemo(() => {
    const y = Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "America/Toronto" }).format(new Date()));
    return Array.from({ length: 30 }, (_, k) => String(y - k));
  }, []);
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, k) => ({
    v: String(k + 1).padStart(2, "0"),
    label: new Intl.DateTimeFormat(fr ? "fr-CA" : "en-CA", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, k, 15))),
  })), [fr]);
  const bumpPhotos = () => {
    setPhotosVersion((v) => v + 1);
    // Jeu de photos modifié après un envoi : nouveaux chemins, jamais un ancien fichier.
    if (uploadedRef.current) { uploadedRef.current = null; setDraft((d) => ({ ...d, clientRequestId: crypto.randomUUID() })); }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setServerError(null);
    setBusy("photos");
    const target = replaceIndex.current;
    replaceIndex.current = null;
    const prepared: Blob[] = [];
    const room = target !== null ? 1 : MAX_PHOTOS - photos.length;
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      try { prepared.push(await sanitizeImage(file)); } catch (e) {
        setServerError(String((e as Error).message).includes("unsupported")
          ? L("Format non pris en charge : utilisez JPEG, PNG ou WebP.", "Unsupported format: use JPEG, PNG or WebP.")
          : L("Cette photo n’a pas pu être préparée (trop lourde?). Essayez-en une autre.", "This photo could not be prepared (too large?). Try another one."));
      }
    }
    if (prepared.length) {
      setPhotos((cur) => {
        if (target !== null && cur[target]) {
          URL.revokeObjectURL(cur[target].url);
          const next = [...cur]; next[target] = toPhoto(prepared[0]); return next;
        }
        return [...cur, ...prepared.map(toPhoto)].slice(0, MAX_PHOTOS);
      });
      bumpPhotos();
      void logFunnelEvent({ event_type: "photo_selected", step: "free_portfolio", metadata: { count: prepared.length }, dedupe_key: `photo_selected:${draft.clientRequestId}` });
      if (goPhotosAfterPick.current) { goPhotosAfterPick.current = false; goStep("photos"); }
    }
    setBusy("idle");
  };

  const pick = (kind: "camera" | "gallery", opts: { replace?: number; fromIntro?: boolean } = {}) => {
    replaceIndex.current = opts.replace ?? null;
    goPhotosAfterPick.current = !!opts.fromIntro;
    (kind === "camera" ? cameraRef : galleryRef).current?.click();
  };
  const removePhoto = (i: number) => {
    setPhotos((p) => { URL.revokeObjectURL(p[i]?.url ?? ""); return p.filter((_, j) => j !== i); });
    setDraft((d) => ({ ...d, beforeIndex: remapIndexAfterRemove(d.beforeIndex, i), afterIndex: remapIndexAfterRemove(d.afterIndex, i) }));
    bumpPhotos();
  };
  const move = (from: number, to: number) => {
    setPhotos((p) => moveItem(p, from, to));
    setDraft((d) => ({ ...d, beforeIndex: remapIndexAfterMove(d.beforeIndex, from, to), afterIndex: remapIndexAfterMove(d.afterIndex, from, to) }));
    bumpPhotos();
  };

  const continueFromPhotos = () => {
    if (!photos.length) return;
    if (!user) {
      try { sessionStorage.setItem(AUTH_FLAG, "1"); } catch { /* noop */ }
      void logFunnelEvent({ event_type: "auth_started", step: "free_portfolio", dedupe_key: `auth_started:portfolio:${draft.clientRequestId}` });
    }
    goStep(stepAfterPhotos(!!user));
  };

  const goOtherLogin = async () => {
    await persistDraft(draft, photos.map((p) => p.blob));
    const back = `${FREE_PORTFOLIO_PATH}?etape=compte`;
    saveReturnPath(back, "contractor_onboarding");
    saveRoleIntent("contractor", { returnPath: back, businessName: draft.businessName.trim() || undefined });
    navigate("/login");
  };

  const needsBusiness = !!user && !quota?.contractor_id;
  const used = quota?.used ?? 0;
  const atLimit = !!user && !!quota && used >= FREE_PORTFOLIO_LIMIT;
  const suggestion = useMemo(() => suggestService(`${draft.title} ${draft.description}`, fr ? "fr" : "en"), [draft.title, draft.description, fr]);

  const submit = async () => {
    if (honeypot || !user) return;
    const errs = validateDraft(draft, photos.length, needsBusiness);
    setErrors(errs);
    setServerError(null);
    if (errs.length) return;
    void logFunnelEvent({ event_type: "profile_completed", step: "free_portfolio", contractor_id: quota?.contractor_id ?? null, metadata: { existing_profile: !needsBusiness }, dedupe_key: `profile_completed:portfolio:${draft.clientRequestId}` });
    try {
      let paths = uploadedRef.current?.version === photosVersion ? uploadedRef.current.paths : null;
      if (!paths) {
        setBusy("uploading");
        paths = await uploadPhotos(user.id, draft.clientRequestId, photos.map((p) => p.blob));
        uploadedRef.current = { version: photosVersion, paths };
      }
      setBusy("submitting");
      const res = await submitPortfolio(draft, paths);
      let completionFailed = false;
      if (draft.completedMonth && res.status === "pending") {
        try { await setProjectCompletion(res.id, draft.completedMonth); } catch { completionFailed = true; }
      }
      const sub: LastSubmission = { id: res.id, status: res.status, serviceName: draft.serviceName.trim(), city: draft.city.trim(), at: Date.now() };
      void logFunnelEvent({ event_type: "free_project_submitted", step: "free_portfolio", metadata: { project_id: res.id, result: res.result, is_sale: false }, dedupe_key: `free_project_submitted:${res.id}` });
      if (res.status === "pending") void logFunnelEvent({ event_type: "moderation_pending", step: "free_portfolio", metadata: { project_id: res.id }, dedupe_key: `moderation_pending:${res.id}` });
      saveLastSubmission(sub);
      setLast(sub);
      await clearDraft();
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      uploadedRef.current = null;
      setDraft((d) => ({ ...emptyDraft(), businessName: d.businessName, contactEmail: d.contactEmail, contactPhone: d.contactPhone }));
      await refresh();
      if (completionFailed) setServerError(L("Projet reçu, mais le mois de réalisation n’a pas été enregistré. Le projet reste valide sans cette date.", "Project received, but the completion month was not saved. The project remains valid without it."));
      goStep("mandats");
    } catch (e) {
      setServerError(portfolioErrorMessage(e, fr ? "fr" : "en"));
    } finally {
      setBusy("idle");
    }
  };

  const startAnother = () => { clearLastSubmission(); setLast(null); goStep("intro"); };
  const withdraw = async (id: string) => {
    const { error } = await supabase.rpc("withdraw_portfolio_project" as never, { p_id: id } as never);
    if (error) setServerError(portfolioErrorMessage(error, fr ? "fr" : "en"));
    await refresh();
  };

  const fieldErr = (f: DraftField) => errors.includes(f);
  const errCls = (f: DraftField) => (fieldErr(f) ? "border-destructive" : "");
  const PREV: Partial<Record<FlowStep, FlowStep>> = { photos: "intro", compte: "photos", projet: "photos" };
  const loadingStep = !settled && step !== "intro";

  return (
    <div className="alex-immersive min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{L("Publiez vos réalisations gratuitement | UNPRO", "Publish your projects for free | UNPRO")}</title>
        <meta name="description" content={L("Vos réalisations parlent mieux que vos publicités. Publiez gratuitement jusqu’à 10 projets, approuvés avant affichage.", "Your projects speak louder than your ads. Publish up to 10 projects for free, reviewed before display.")} />
        <link rel="canonical" href="https://unpro.ca/entrepreneurs/realisations" />
      </Helmet>

      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-label={L("Choisir des photos", "Choose photos")} onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />

      <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
        {step === "intro" ? (
          <Link to="/entrepreneurs" className="text-sm text-muted-foreground hover:text-foreground">← {L("Espace entrepreneurs", "Contractors")}</Link>
        ) : PREV[step] ? (
          <button type="button" onClick={() => goStep(PREV[step]!)} className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{L("Retour", "Back")}</button>
        ) : null}
        <Progress step={step} fr={fr} />

        {serverError && step !== "projet" && <p role="alert" className="mt-4 rounded-2xl border border-destructive/40 p-3 text-sm text-destructive">{serverError}</p>}

        {loadingStep ? (
          <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" />{L("Reprise de votre brouillon…", "Restoring your draft…")}</p>
        ) : step === "intro" ? (
          <>
            <section className="mt-6">
              <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-foreground">{L("Vos réalisations parlent mieux que vos publicités.", "Your projects speak louder than your ads.")}</h1>
              <p className="mt-3 text-base text-muted-foreground">{L("Publiez gratuitement jusqu’à 10 projets. Inspirez les propriétaires et faites connaître votre savoir-faire.", "Publish up to 10 projects for free. Inspire homeowners and showcase your craft.")}</p>
              <div className="mt-6 flex flex-col gap-2">
                {photos.length > 0 ? (
                  <Button className="min-h-14 text-base" onClick={() => goStep("photos")}>{L(`Reprendre mon brouillon (${photos.length} photo${photos.length > 1 ? "s" : ""})`, `Resume my draft (${photos.length} photo${photos.length > 1 ? "s" : ""})`)}<ArrowRight className="ml-2 h-5 w-5" /></Button>
                ) : (
                  <Button className="min-h-14 text-base" disabled={busy === "photos" || atLimit} onClick={() => pick("gallery", { fromIntro: true })}>
                    {busy === "photos" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ImagePlus className="mr-2 h-5 w-5" />}{L("Ajouter mes photos gratuitement", "Add my photos for free")}
                  </Button>
                )}
                {photos.length === 0 && !atLimit && (
                  <Button variant="ghost" className="min-h-11" onClick={() => pick("camera", { fromIntro: true })}><Camera className="mr-2 h-4 w-4" />{L("Prendre une photo maintenant", "Take a photo now")}</Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{L("Aucun compte pour choisir vos photos. Aucun paiement.", "No account needed to choose your photos. No payment.")}</p>
              {user && quota && <p className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium" aria-live="polite">{quotaLabel(used, fr ? "fr" : "en")}</p>}
              {atLimit && <p role="status" className="mt-3 text-sm text-foreground">{L("Vous avez atteint vos 10 projets gratuits. Retirez un projet pour en ajouter un autre.", "You have reached your 10 free projects. Withdraw one to add another.")}</p>}
            </section>

            <div className="mt-8"><PortfolioShowcase fr={fr} /></div>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                [L("Gratuit jusqu’à 10 projets", "Free for up to 10 projects"), L("Aucune carte de crédit, aucun abonnement.", "No credit card, no subscription.")],
                [L("Approuvé avant affichage", "Reviewed before display"), L("Notre équipe vérifie chaque projet. Vos qualifications (RBQ, assurances) sont vérifiées séparément.", "Our team reviews each project. Your qualifications (RBQ, insurance) are verified separately.")],
                [L("Vos photos restent les vôtres", "Your photos stay yours"), L("Retrait en tout temps. La localisation des photos est retirée automatiquement.", "Withdraw anytime. Photo location data is removed automatically.")],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3 rounded-[22px] border border-border bg-card p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span><span className="block font-semibold text-foreground">{t}</span><span className="text-muted-foreground">{d}</span></span>
                </li>
              ))}
            </ul>

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
            {(quota?.approved ?? 0) > 0 && <div className="mt-6"><PortfolioUpgradeCard fr={fr} contractorId={quota?.contractor_id ?? null} onContinueFree={() => goStep("photos")} /></div>}
          </>
        ) : step === "photos" ? (
          <section className="mt-6">
            <h1 className="text-2xl font-semibold tracking-tight">{L("Vos photos", "Your photos")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{L("De 1 à 4 photos. Chaque photo est « Projet terminé » par défaut; marquez une photo « Avant » et une « Après » si vous en avez.", "1 to 4 photos. Each photo is “Finished project” by default; mark one “Before” and one “After” if you have them.")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photos.map((p, i) => (
                <div key={p.url} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <img src={p.url} alt={L(`Photo ${i + 1}`, `Photo ${i + 1}`)} className="aspect-square w-full object-cover" />
                  <div role="radiogroup" aria-label={L(`Type de la photo ${i + 1}`, `Photo ${i + 1} type`)} className="grid grid-cols-3 gap-1 p-1.5 text-xs">
                    {(["finished", "before", "after"] as PhotoKind[]).map((k) => {
                      const on = photoKindOf(i, draft) === k;
                      return (
                        <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setKind(i, k)}
                          className={`min-h-10 rounded-lg px-1 leading-tight ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {k === "finished" ? L("Terminé", "Finished") : k === "before" ? L("Avant", "Before") : L("Après", "After")}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between gap-1 px-1.5 pb-1.5">
                    <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={L("Déplacer à gauche", "Move left")} className="min-h-10 min-w-10 rounded-lg bg-muted text-foreground disabled:opacity-40"><ChevronLeft className="mx-auto h-4 w-4" /></button>
                    <button type="button" onClick={() => pick("gallery", { replace: i })} aria-label={L("Remplacer la photo", "Replace photo")} className="min-h-10 min-w-10 rounded-lg bg-muted text-foreground"><Replace className="mx-auto h-4 w-4" /></button>
                    <button type="button" onClick={() => removePhoto(i)} aria-label={L("Retirer la photo", "Remove photo")} className="min-h-10 min-w-10 rounded-lg bg-muted text-foreground"><Trash2 className="mx-auto h-4 w-4" /></button>
                    <button type="button" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} aria-label={L("Déplacer à droite", "Move right")} className="min-h-10 min-w-10 rounded-lg bg-muted text-foreground disabled:opacity-40"><ChevronRight className="mx-auto h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {photos.length < MAX_PHOTOS && (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={() => pick("camera")} disabled={busy !== "idle"}><Camera className="mr-2 h-4 w-4" />{L("Prendre", "Take")}</Button>
                <Button type="button" variant="outline" className="min-h-12 flex-1" onClick={() => pick("gallery")} disabled={busy !== "idle"}><ImagePlus className="mr-2 h-4 w-4" />{L("Choisir", "Choose")}</Button>
              </div>
            )}
            {busy === "photos" && <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">{L("Préparation des photos…", "Preparing photos…")}</p>}
            {photoNotice && <p className="mt-2 text-sm text-foreground" role="status">{photoNotice}</p>}
            <p className="mt-3 text-xs text-muted-foreground">{L("Évitez visages, plaques et adresses visibles. Vos photos restent sur cet appareil jusqu’à l’envoi; la localisation est retirée.", "Avoid faces, licence plates and visible addresses. Your photos stay on this device until you send them; location data is removed.")}</p>
            <Button className="mt-6 min-h-12 w-full" disabled={!photos.length || busy !== "idle"} onClick={continueFromPhotos}>{L("Continuer", "Continue")}<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </section>
        ) : step === "compte" ? (
          <section className="mt-6 space-y-4" aria-live="polite">
            <h1 className="text-2xl font-semibold tracking-tight">{L("Créez votre compte gratuit", "Create your free account")}</h1>
            <p className="text-sm text-muted-foreground">{L(`Pour enregistrer vos ${photos.length} photo${photos.length > 1 ? "s" : ""} en votre nom. Votre brouillon est gardé sur cet appareil pendant 24 h. Aucun paiement.`, `To save your ${photos.length} photo${photos.length > 1 ? "s" : ""} under your name. Your draft is kept on this device for 24 h. No payment.`)}</p>
            <div className="flex gap-2" aria-hidden="true">{photos.slice(0, 4).map((p) => <img key={p.url} src={p.url} alt="" className="h-14 w-14 rounded-xl object-cover" />)}</div>
            <PhoneOtpForm />
            <Button type="button" variant="outline" className="min-h-12 w-full" onClick={() => void goOtherLogin()}>{L("Continuer par courriel ou Google", "Continue with email or Google")}</Button>
          </section>
        ) : step === "projet" ? (
          atLimit ? (
            <p role="status" className="mt-6 rounded-[28px] border border-border bg-card p-5 text-sm">{L("Vous avez atteint vos 10 projets gratuits. Retirez un projet pour en ajouter un autre.", "You have reached your 10 free projects. Withdraw one to add another.")}</p>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{L("Votre projet", "Your project")}</h1>
                {user && quota && <p className="mt-1 text-sm text-muted-foreground">{quotaLabel(used, fr ? "fr" : "en")}</p>}
              </div>

              {needsBusiness ? (
                <fieldset className="space-y-3 rounded-[22px] border border-border p-4">
                  <legend className="px-1 text-sm font-semibold">{L("Votre entreprise", "Your business")}</legend>
                  <Input aria-label={L("Nom de l’entreprise", "Business name")} className={`min-h-12 ${errCls("business")}`} value={draft.businessName} maxLength={120} autoComplete="organization" onChange={(e) => set("businessName", e.target.value)} placeholder={L("Nom de l’entreprise", "Business name")} />
                  <Input aria-label={L("Courriel de l’entreprise", "Business email")} type="email" inputMode="email" autoComplete="email" className={`min-h-12 ${errCls("contact")}`} value={draft.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder={L("Courriel de l’entreprise", "Business email")} />
                  <Input aria-label={L("Téléphone de l’entreprise", "Business phone")} type="tel" inputMode="tel" autoComplete="tel" className={`min-h-12 ${errCls("contact")}`} value={draft.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder={L("ou téléphone", "or phone")} />
                  {fieldErr("business") && <p className="text-sm text-destructive">{L("Indiquez le nom de votre entreprise.", "Enter your business name.")}</p>}
                  {fieldErr("contact") && <p className="text-sm text-destructive">{L("Indiquez un courriel ou un téléphone valide.", "Enter a valid email or phone.")}</p>}
                  <p className="text-xs text-muted-foreground">{L("Pour vous joindre au sujet de la modération. Jamais affiché.", "To reach you about the review. Never displayed.")}</p>
                </fieldset>
              ) : known?.business_name ? (
                <p className="rounded-[22px] border border-border bg-card p-4 text-sm"><span className="text-muted-foreground">{L("Entreprise : ", "Business: ")}</span><span className="font-semibold">{known.business_name}</span></p>
              ) : null}

              <label className="block text-sm font-semibold">{L("Titre du projet", "Project title")}
                <Input className={`mt-1 min-h-12 ${errCls("title")}`} value={draft.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder={L("Ex. Réfection de toiture en bardeaux", "E.g. Shingle roof replacement")} />
                {fieldErr("title") && <span className="mt-1 block text-sm font-normal text-destructive">{L("De 3 à 120 caractères.", "3 to 120 characters.")}</span>}
              </label>
              <div>
                <label className="block text-sm font-semibold">{L("Type de travaux", "Type of work")}
                  <Input className={`mt-1 min-h-12 ${errCls("serviceName")}`} value={draft.serviceName} maxLength={80} onChange={(e) => set("serviceName", e.target.value)} placeholder={L("Ex. Toiture", "E.g. Roofing")} />
                </label>
                {suggestion && suggestion.toLowerCase() !== draft.serviceName.trim().toLowerCase() && (
                  <button type="button" onClick={() => set("serviceName", suggestion)} className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/40 px-3 text-sm text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />{L(`Clara suggère « ${suggestion} » d’après votre titre`, `Clara suggests “${suggestion}” from your title`)}
                  </button>
                )}
                {fieldErr("serviceName") && <span className="mt-1 block text-sm text-destructive">{L("Indiquez le type de travaux.", "Enter the type of work.")}</span>}
              </div>
              <label className="block text-sm font-semibold">{L("Ville (approximative)", "City (approximate)")}
                <Input className={`mt-1 min-h-12 ${errCls("city")}`} value={draft.city} maxLength={80} autoComplete="address-level2" onChange={(e) => set("city", e.target.value)} placeholder={L("Ex. Laval", "E.g. Laval")} />
                <span className={`mt-1 block text-xs font-normal ${fieldErr("city") ? "text-destructive" : "text-muted-foreground"}`}>{L("Ville seulement, jamais l’adresse du client.", "City only, never the client’s address.")}</span>
              </label>
              <fieldset>
                <legend className="text-sm font-semibold">{L("Mois et année de réalisation (facultatif)", "Month and year completed (optional)")}</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select aria-label={L("Mois de réalisation", "Month completed")} value={cmMonth ?? ""} onChange={(e) => setCompletion(cmYear ?? "", e.target.value)}
                    className={`min-h-12 rounded-md border border-input bg-background px-3 text-sm text-foreground ${errCls("completedMonth")}`}>
                    <option value="">{L("Mois", "Month")}</option>
                    {monthNames.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
                  </select>
                  <select aria-label={L("Année de réalisation", "Year completed")} value={cmYear ?? ""} onChange={(e) => setCompletion(e.target.value, cmMonth ?? "")}
                    className={`min-h-12 rounded-md border border-input bg-background px-3 text-sm text-foreground ${errCls("completedMonth")}`}>
                    <option value="">{L("Année", "Year")}</option>
                    {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className={`mt-1 block text-xs ${fieldErr("completedMonth") ? "text-destructive" : "text-muted-foreground"}`}>
                  {fieldErr("completedMonth") ? L("Choisissez le mois et l’année (pas dans le futur), ou laissez les deux vides.", "Pick month and year (not in the future), or leave both empty.") : L("Affiché « Réalisé en … » seulement si vous le renseignez.", "Shown as “Completed in …” only if you fill it in.")}
                </span>
              </fieldset>

              {showDetail || draft.description ? (
                <label className="block text-sm font-semibold">{L("Bref détail (facultatif)", "Short detail (optional)")}
                  <Textarea className={`mt-1 ${errCls("description")}`} value={draft.description} maxLength={600} rows={3} onChange={(e) => set("description", e.target.value)} />
                </label>
              ) : (
                <button type="button" className="min-h-10 text-sm text-primary underline" onClick={() => setShowDetail(true)}>{L("+ Ajouter un bref détail (facultatif)", "+ Add a short detail (optional)")}</button>
              )}

              <div className="hidden" aria-hidden="true"><label>Site web<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label></div>

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

              <Button type="submit" className="min-h-12 w-full" disabled={busy !== "idle"}>
                {busy === "uploading" || busy === "submitting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busy === "uploading" ? L("Envoi des photos…", "Uploading photos…") : L("Enregistrement…", "Saving…")}</> : L("Envoyer pour approbation — gratuit", "Submit for approval — free")}
              </Button>
              <p className="text-xs text-muted-foreground">{L("Gratuit. Ne garantit aucune demande, aucun classement ni visibilité externe. L’approbation d’un projet ne vérifie pas votre licence RBQ ni vos assurances.", "Free. No guaranteed requests, ranking or external visibility. Project approval does not verify your RBQ licence or insurance.")}</p>
            </form>
          )
        ) : step === "mandats" ? (
          <div className="mt-6">
            <p role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />{L("Projet reçu — en attente d’approbation.", "Project received — awaiting approval.")}</p>
            <PortfolioMandates fr={fr} serviceName={last?.serviceName ?? ""} city={last?.city ?? ""} specialty={known?.specialty ?? null} contractorId={quota?.contractor_id ?? null} onDone={() => goStep("merci")} />
          </div>
        ) : (
          <section className="mt-6 space-y-6">
            <div className="rounded-[28px] border border-border bg-card p-5" role="status">
              <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">{L("Merci! Votre réalisation est bien reçue.", "Thank you! Your project was received.")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {last?.status === "approved" ? L("Elle est approuvée et affichée.", "It is approved and shown.") : L("Statut : en attente d’approbation. Elle sera affichée seulement après la vérification de notre équipe.", "Status: awaiting approval. It will only appear after our team’s review.")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{L("L’approbation d’un projet ne vérifie pas votre licence RBQ, vos assurances ni vos qualifications.", "Project approval does not verify your RBQ licence, insurance or qualifications.")}</p>
              {quota && <p className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium">{quotaLabel(used, fr ? "fr" : "en")}</p>}
              {used < FREE_PORTFOLIO_LIMIT && <Button variant="outline" className="mt-4 min-h-12 w-full" onClick={startAnother}>{L("Ajouter un autre projet", "Add another project")}</Button>}
            </div>
            <PortfolioUpgradeCard fr={fr} contractorId={quota?.contractor_id ?? null} onContinueFree={startAnother} />
          </section>
        )}
      </main>
    </div>
  );
}
