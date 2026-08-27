/**
 * UNPRO — /entrepreneurs/profil
 *
 * Assistant de complétion du profil de MATCHING. Une question à la fois,
 * sauvegarde progressive à chaque réponse, reprise automatique (jamais de
 * redémarrage), puis transition vers les forfaits — le prix n'apparaît
 * qu'après la démonstration de valeur.
 *
 * Attribution : audit, audit_token, jeton d'activation (?t=), ref affilié et
 * UTM sont conservés sur la ligne serveur ET dans l'URL vers les forfaits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { AuditProHeader } from "@/components/audit-ia/AuditProHeader";
import { HowItWorksBlock } from "@/components/audit-ia/HowItWorksBlock";
import {
  completionOf,
  questionsForTrade,
  type MatchingQuestion,
} from "@/lib/matching/matchingQuestions";

const SESSION_STORAGE_KEY = "unpro_matching_session_key";

function getSessionKey(): string {
  try {
    const existing = localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const key = `mp_${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_STORAGE_KEY, key);
    return key;
  } catch {
    return `mp_${Math.random().toString(36).slice(2)}${Date.now()}`;
  }
}

type Answers = Record<string, unknown>;

export default function PageMatchingProfileWizard() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { lang } = useLanguage();
  // French-first : l'anglais n'est servi que si l'utilisateur l'a explicitement choisi.
  const explicitEn = (() => {
    try { return localStorage.getItem("unpro-lang") === "en"; } catch { return false; }
  })();
  const fr = !(explicitEn && lang === "en");

  const sessionKey = useMemo(getSessionKey, []);
  const businessName = sp.get("entreprise");
  const city = sp.get("ville");
  const trade = sp.get("metier");
  const auditId = sp.get("audit");
  const auditToken = sp.get("audit_token");
  const activationToken = sp.get("t");
  const affiliateRef = sp.get("ref");

  const questions = useMemo(() => questionsForTrade(trade), [trade]);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [chipDraft, setChipDraft] = useState("");
  const startedLogged = useRef(false);

  const context = useMemo(
    () => ({
      session_key: sessionKey,
      business_name: businessName,
      city,
      trade,
      audit_id: auditId,
      audit_token: auditToken,
      activation_token: activationToken,
      affiliate_ref: affiliateRef,
      utm: {
        utm_source: sp.get("utm_source"),
        utm_medium: sp.get("utm_medium"),
        utm_campaign: sp.get("utm_campaign"),
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey],
  );

  // Reprise : on recharge la progression réelle avant d'afficher quoi que ce soit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.functions.invoke("matching-profile", {
        body: { action: "get", session_key: sessionKey },
      });
      if (cancelled) return;
      const profile = (data as any)?.profile;
      if (profile?.answers) {
        setAnswers(profile.answers as Answers);
        if (profile.status === "completed") setDone(true);
        const firstUnanswered = questions.findIndex((q) => !isFilled(profile.answers[q.key]));
        setIndex(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  useEffect(() => {
    if (startedLogged.current) return;
    startedLogged.current = true;
    void logFunnelEvent({
      event_type: "profile_started",
      event_source: "app",
      current_path: "/entrepreneurs/profil",
      step: "matching_profile",
      metadata: { audit_id: auditId, outreach_token: activationToken, ref: affiliateRef },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (next: Answers, complete = false) => {
      setSaving(true);
      const { data } = await supabase.functions.invoke("matching-profile", {
        body: { ...context, action: complete ? "complete" : "save", answers: next },
      });
      setSaving(false);
      return (data as any)?.profile ?? null;
    },
    [context],
  );

  const q = questions[index];
  const completion = completionOf(answers);

  async function commit(value: unknown) {
    if (!q) return;
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    setChipDraft("");
    void logFunnelEvent({
      event_type: "matching_field_completed",
      event_source: "app",
      current_path: "/entrepreneurs/profil",
      step: q.key,
      metadata: { completion: completionOf(next) },
    });
    const isLast = index >= questions.length - 1;
    await save(next, isLast);
    if (isLast) {
      setDone(true);
      void logFunnelEvent({
        event_type: "profile_completed",
        event_source: "app",
        current_path: "/entrepreneurs/profil",
        metadata: { completion: completionOf(next), audit_id: auditId },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIndex((i) => i + 1);
    }
  }

  function goToPlans() {
    void logFunnelEvent({
      event_type: "plans_viewed",
      event_source: "app",
      current_path: "/entrepreneurs/profil",
      metadata: { audit_id: auditId, outreach_token: activationToken },
    });
    const params = new URLSearchParams();
    if (businessName) params.set("entreprise", businessName);
    if (city) params.set("ville", city);
    if (trade) params.set("metier", trade);
    if (auditId) params.set("audit", auditId);
    if (auditToken) params.set("audit_token", auditToken);
    if (activationToken) params.set("t", activationToken);
    if (affiliateRef) params.set("ref", affiliateRef);
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = sp.get(k);
      if (v) params.set(k, v);
    }
    navigate(`/entrepreneurs/garantie?${params.toString()}`);
  }

  return (
    <div className="audit-gold min-h-[100dvh] bg-background text-foreground">
      <Helmet>
        <title>{fr ? "Compléter mon profil professionnel | UNPRO" : "Complete my professional profile | UNPRO"}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <AuditProHeader />

      <main className="mx-auto w-full max-w-xl px-4 pb-32 pt-8 sm:px-6">
        {/* Progression — préparation du profil IA UNPRO (jamais un score OpenAI) */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {fr ? "Préparation du profil IA UNPRO" : "UNPRO AI profile readiness"}
            </p>
            <span className="text-[13px] font-bold tabular-nums text-foreground">{completion}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          {businessName && (
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {[businessName, city, trade].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {fr ? "Reprise de votre profil…" : "Resuming your profile…"}
          </div>
        ) : done ? (
          <div className="space-y-4">
            <section className="rounded-[24px] border border-success/40 bg-[hsl(152_69%_31%/0.06)] p-5 shadow-sm sm:p-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-card px-2.5 py-1 text-[11.5px] font-semibold text-success">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                {fr ? "Profil complété" : "Profile completed"}
              </span>
              <h1 className="mt-3 text-[26px] font-bold leading-tight text-foreground">
                {fr ? "Votre profil est prêt pour UNPRO" : "Your profile is ready for UNPRO"}
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {fr
                  ? "Vos services, territoires et disponibilités sont maintenant structurés. Vous devenez admissible aux recommandations UNPRO, et votre profil est préparé pour la découverte par les assistants IA."
                  : "Your services, territories and availability are now structured. You become eligible for UNPRO recommendations, and your profile is prepared for AI assistant discovery."}
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {fr
                  ? "UNPRO ne garantit ni position ni recommandation dans ChatGPT. Aucune plateforme d'IA ne vend de classement."
                  : "UNPRO guarantees no placement or recommendation in ChatGPT. No AI platform sells ranking."}
              </p>
            </section>

            <HowItWorksBlock lang={fr ? "fr" : "en"} />

            <Button
              onClick={goToPlans}
              size="lg"
              className="gold-btn h-14 w-full rounded-2xl border-0 text-[15px] font-bold hover:text-primary-foreground"
            >
              {fr ? "Voir mon activation UNPRO" : "See my UNPRO activation"}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : q ? (
          <QuestionCard
            key={q.key}
            q={q}
            fr={fr}
            value={answers[q.key]}
            chipDraft={chipDraft}
            setChipDraft={setChipDraft}
            saving={saving}
            index={index}
            total={questions.length}
            onBack={index > 0 ? () => setIndex((i) => i - 1) : undefined}
            onCommit={commit}
          />
        ) : null}
      </main>
    </div>
  );
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function QuestionCard({
  q,
  fr,
  value,
  chipDraft,
  setChipDraft,
  saving,
  index,
  total,
  onBack,
  onCommit,
}: {
  q: MatchingQuestion;
  fr: boolean;
  value: unknown;
  chipDraft: string;
  setChipDraft: (v: string) => void;
  saving: boolean;
  index: number;
  total: number;
  onBack?: () => void;
  onCommit: (v: unknown) => void;
}) {
  const [multi, setMulti] = useState<string[]>(Array.isArray(value) ? (value as string[]) : []);
  const [chips, setChips] = useState<string[]>(Array.isArray(value) ? (value as string[]) : []);

  const label = fr ? q.label : q.label_en;
  const help = fr ? q.help : q.help_en;

  return (
    <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7">
      <p className="text-[11.5px] uppercase tracking-wide text-muted-foreground">
        {fr ? "Question" : "Question"} {index + 1}/{total}
      </p>
      <h1 className="mt-1.5 text-[22px] font-bold leading-tight text-foreground">{label}</h1>
      {help && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{help}</p>}

      <div className="mt-5 space-y-2.5">
        {q.kind === "single" &&
          (q.options ?? []).map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={saving}
              onClick={() => onCommit(o.value)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-left text-[15px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary disabled:opacity-60"
            >
              {fr ? o.label : o.label_en}
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </button>
          ))}

        {q.kind === "multi" && (
          <>
            {(q.options ?? []).map((o) => {
              const on = multi.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    setMulti((m) => (on ? m.filter((x) => x !== o.value) : [...m, o.value]))
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-[15px] font-medium transition-colors ${
                    on
                      ? "border-primary/60 bg-secondary text-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {fr ? o.label : o.label_en}
                  {on && <Check className="h-4 w-4 text-success" aria-hidden />}
                </button>
              );
            })}
            <Button
              disabled={multi.length === 0 || saving}
              onClick={() => onCommit(multi)}
              size="lg"
              className="gold-btn mt-2 h-12 w-full rounded-2xl border-0 font-bold hover:text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : fr ? "Continuer" : "Continue"}
            </Button>
          </>
        )}

        {q.kind === "chips" && (
          <>
            <div className="flex gap-2">
              <Input
                value={chipDraft}
                onChange={(e) => setChipDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && chipDraft.trim()) {
                    e.preventDefault();
                    setChips((c) => [...c, chipDraft.trim()]);
                    setChipDraft("");
                  }
                }}
                placeholder={q.placeholder}
                className="h-12 rounded-2xl text-[16px]"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 shrink-0 rounded-2xl"
                onClick={() => {
                  if (!chipDraft.trim()) return;
                  setChips((c) => [...c, chipDraft.trim()]);
                  setChipDraft("");
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {chips.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {chips.map((c, i) => (
                  <li key={`${c}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setChips((prev) => prev.filter((_, j) => j !== i))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground"
                    >
                      {c}
                      <X className="h-3 w-3 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              disabled={chips.length === 0 || saving}
              onClick={() => onCommit(chips)}
              size="lg"
              className="gold-btn mt-2 h-12 w-full rounded-2xl border-0 font-bold hover:text-primary-foreground"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : fr ? "Continuer" : "Continue"}
            </Button>
          </>
        )}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground underline underline-offset-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {fr ? "Retour" : "Back"}
        </button>
      )}
    </section>
  );
}
