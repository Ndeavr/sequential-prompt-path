/**
 * TunnelE2ETestPanel — /admin/tunnel-reality
 * Send exactly ONE real SMS through the full tunnel and verify each step.
 * Hard cap: 1 SMS per click · never touches production KPIs (is_test_e2e=true).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertOctagon, Beaker, CheckCircle2, Circle, ExternalLink,
  Loader2, RotateCcw, Send, User, XCircle, MinusCircle,
} from "lucide-react";
import { toast } from "sonner";

type StepState = "WAITING" | "PASS" | "FAIL" | "BLOCKED";
interface Step { key: string; label: string; state: StepState }
interface TestSnapshot {
  id: string;
  prospect_id: string;
  invitation_token: string;
  landing_url: string;
  phone_e164: string;
  first_name: string | null;
  business_name: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  sms_sid: string | null;
  sms_error: string | null;
  created_at: string;
  status: string;
  overall: "PASS" | "FAIL" | "IN_PROGRESS";
  steps: Step[];
}

const LS_KEY = "unpro.tunnel.e2e.form.v1";
const LS_TEST_ID = "unpro.tunnel.e2e.testId.v1";

const CATEGORY_OPTIONS = [
  "Toiture", "Plomberie", "Électricité", "Chauffage / climatisation",
  "Peinture", "Rénovation intérieure", "Fenêtres et portes", "Excavation",
];
const CITY_OPTIONS = [
  "Montréal", "Laval", "Longueuil", "Québec", "Gatineau", "Sherbrooke",
  "Trois-Rivières", "Lévis", "Terrebonne", "Saint-Jean-sur-Richelieu",
];

const STATE_ICON = {
  PASS: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  FAIL: <XCircle className="w-4 h-4 text-red-400" />,
  BLOCKED: <MinusCircle className="w-4 h-4 text-amber-400" />,
  WAITING: <Circle className="w-4 h-4 text-white/30" />,
} as const;

const STATE_BADGE: Record<StepState, string> = {
  PASS: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  FAIL: "bg-red-500/15 border-red-500/40 text-red-300",
  BLOCKED: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  WAITING: "bg-white/5 border-border text-white/50",
};

interface Props {
  onGateChange?: (pass: boolean) => void;
}

export default function TunnelE2ETestPanel({ onGateChange }: Props) {
  const [form, setForm] = useState({
    phone: "", first_name: "", business_name: "Test E2E UNPRO",
    email: "", category: "Toiture", city: "Montréal",
  });
  const [testId, setTestId] = useState<string | null>(null);
  const [snap, setSnap] = useState<TestSnapshot | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  // Load preferences
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setForm((f) => ({ ...f, ...JSON.parse(raw) }));
      const t = localStorage.getItem(LS_TEST_ID);
      if (t) setTestId(t);
    } catch { /* ignore */ }
  }, []);

  const persistForm = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const loadStatus = useCallback(async (id: string | null) => {
    try {
      const { data, error } = await supabase.functions.invoke("tunnel-e2e-test", {
        body: { action: "status", test_id: id },
      });
      if (error) throw error;
      const t = (data as any)?.test as TestSnapshot | null;
      setSnap(t);
      onGateChange?.(t?.overall === "PASS");
    } catch (e) {
      console.warn("e2e status", e);
    }
  }, [onGateChange]);

  useEffect(() => {
    loadStatus(testId);
    const id = setInterval(() => loadStatus(testId), 5000);
    return () => clearInterval(id);
  }, [loadStatus, testId]);

  const sendOne = async () => {
    if (!form.phone.trim()) { toast.error("Numéro requis"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("tunnel-e2e-test", {
        body: {
          action: "send",
          phone: form.phone,
          first_name: form.first_name,
          business_name: form.business_name,
          email: form.email,
          category: form.category,
          city: form.city,
        },
      });
      if (error) throw error;
      const r = data as any;
      if (!r?.ok && r?.error) {
        toast.error(`Échec envoi : ${r.error}`);
      } else {
        toast.success(`SMS envoyé · SID ${r?.sms_sid ?? "—"}`);
      }
      if (r?.test_id) {
        setTestId(r.test_id);
        try { localStorage.setItem(LS_TEST_ID, r.test_id); } catch { /* ignore */ }
        await loadStatus(r.test_id);
      }
      setConfirmSend(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    try {
      await supabase.functions.invoke("tunnel-e2e-test", {
        body: { action: "reset", test_id: testId },
      });
      setTestId(null);
      setSnap(null);
      try { localStorage.removeItem(LS_TEST_ID); } catch { /* ignore */ }
      onGateChange?.(false);
      toast.success("Test réinitialisé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const overallBadge = useMemo(() => {
    if (!snap) return null;
    if (snap.overall === "PASS") return { label: "TEST PASS", cls: STATE_BADGE.PASS };
    if (snap.overall === "FAIL") return { label: "TEST FAIL", cls: STATE_BADGE.FAIL };
    return { label: "EN COURS", cls: STATE_BADGE.BLOCKED };
  }, [snap]);

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center">
            <Beaker className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-sky-100">Test E2E réel</div>
            <div className="text-xs text-sky-100/70 mt-0.5">
              Envoyer un seul SMS réel à un numéro contrôlé et vérifier tout le tunnel jusqu'à l'éligibilité Alex.
            </div>
          </div>
        </div>
        {overallBadge && (
          <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${overallBadge.cls}`}>
            {overallBadge.label}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <label className="text-xs space-y-1">
          <span className="opacity-70">Numéro mobile de test *</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => persistForm({ phone: e.target.value })}
            placeholder="+1 514 555 1234"
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="opacity-70">Prénom</span>
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => persistForm({ first_name: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="opacity-70">Nom d'entreprise test</span>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => persistForm({ business_name: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="opacity-70">Email (optionnel)</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => persistForm({ email: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="opacity-70">Catégorie de service</span>
          <select
            value={form.category}
            onChange={(e) => persistForm({ category: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="opacity-70">Ville</span>
          <select
            value={form.city}
            onChange={(e) => persistForm({ city: e.target.value })}
            className="w-full rounded-lg bg-white/5 border border-border px-3 py-2 text-sm"
          >
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setConfirmSend(true)}
          disabled={sending || !form.phone.trim()}
          className="rounded-lg bg-sky-500 text-white px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer 1 SMS réel
        </button>
        {snap && (
          <>
            <a
              href={`/admin/prospects/${snap.prospect_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-xs inline-flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" /> Voir le prospect test
            </a>
            <a
              href={snap.landing_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-xs inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ouvrir la landing test
            </a>
            <button
              onClick={reset}
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-xs inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser le test
            </button>
          </>
        )}
      </div>

      {snap?.sms_error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-mono">
          Twilio : {snap.sms_error}
        </div>
      )}

      {/* Checklist */}
      {snap && (
        <div className="rounded-xl border border-border bg-black/20 divide-y divide-border">
          {snap.steps.map((s, i) => (
            <div key={s.key} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] opacity-40 w-4 tabular-nums">{i + 1}</span>
                {STATE_ICON[s.state]}
                <span className="truncate">{s.label}</span>
              </div>
              <span className={`text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 ${STATE_BADGE[s.state]}`}>
                {s.state}
              </span>
            </div>
          ))}
        </div>
      )}

      {snap && (
        <div className="text-[11px] opacity-60">
          Test créé {new Date(snap.created_at).toLocaleString("fr-CA")} · SID {snap.sms_sid ?? "—"} · Token {snap.invitation_token.slice(0, 8)}…
        </div>
      )}

      {/* Confirm modal */}
      {confirmSend && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => !sending && setConfirmSend(false)}
        >
          <div
            className="bg-background border border-sky-500/40 rounded-2xl w-full max-w-md p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-6 h-6 text-sky-300 shrink-0" />
              <div>
                <div className="text-base font-semibold">Envoyer 1 SMS réel ?</div>
                <div className="text-xs opacity-70 mt-1">
                  Un seul message Twilio à {form.phone}. Cet envoi est marqué comme test E2E et n'entre pas dans les KPI de production.
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmSend(false)}
                disabled={sending}
                className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={sendOne}
                disabled={sending}
                className="rounded-lg bg-sky-500 text-white px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
