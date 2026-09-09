/**
 * UNPRO — /admin/command
 * Founder Command Center: only two manual classes — APPROBATIONS and APPELS.
 * Everything else is autonomous; shown here as health/results, not as tasks.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck, PhoneCall, Activity, AlertTriangle, RefreshCw,
  Check, X, Pencil, Bot, TrendingUp,
} from "lucide-react";
import {
  usePendingApprovals, useCallTasks, useTacticPerformance,
  useExceptionalBlockers, useAutonomyActivity,
  useApprovalDecision, useRecordCallOutcome, useRefreshCallQueue,
  type FounderApproval, type FounderCallTask,
} from "@/hooks/useFounderCommand";

const riskTone = (r: string | null) =>
  r === "high" ? "bg-red-500/15 text-red-300 border-red-500/30"
    : r === "low" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";

function ApprovalCard({ approval }: { approval: FounderApproval }) {
  const decide = useApprovalDecision();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(approval.proposed_change, null, 2));

  return (
    <Card className="glass-strong p-5 space-y-4 rounded-[28px] border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] uppercase">{approval.kind}</Badge>
            <Badge variant="outline" className={`text-[10px] uppercase ${riskTone(approval.risk_level)}`}>
              risque {approval.risk_level ?? "medium"}
            </Badge>
            {approval.version > 1 && (
              <Badge variant="outline" className="text-[10px]">v{approval.version}</Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-readable">{approval.title}</h3>
          <p className="text-xs text-readable-muted mt-0.5">
            Proposé par {approval.proposed_by_agent ?? "système"}
          </p>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-readable-muted">Raison</dt>
          <dd className="text-readable-body">{approval.reason ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-readable-muted">Impact attendu</dt>
          <dd className="text-readable-body">{approval.expected_impact ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-wide text-readable-muted">Retour arrière</dt>
          <dd className="text-readable-body">{approval.rollback_plan ?? "—"}</dd>
        </div>
      </dl>

      <details className="text-xs">
        <summary className="cursor-pointer text-readable-muted">Preuve et changement proposé</summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] text-readable-body">
{JSON.stringify({ evidence: approval.evidence, change: approval.proposed_change }, null, 2)}
        </pre>
      </details>

      {editing && (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          className="font-mono text-xs"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="gap-1.5 rounded-xl"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ approval_id: approval.id, decision: "approve" })}
        >
          <Check className="h-4 w-4" /> Approuver
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 rounded-xl"
          disabled={decide.isPending}
          onClick={() => {
            if (!editing) { setEditing(true); return; }
            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(draft); } catch { return; }
            decide.mutate({ approval_id: approval.id, decision: "modify", modified_change: parsed });
            setEditing(false);
          }}
        >
          <Pencil className="h-4 w-4" /> {editing ? "Enregistrer" : "Modifier"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 rounded-xl text-red-300"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ approval_id: approval.id, decision: "reject" })}
        >
          <X className="h-4 w-4" /> Rejeter
        </Button>
      </div>
    </Card>
  );
}

function CallCard({ task }: { task: FounderCallTask }) {
  const record = useRecordCallOutcome();
  const [note, setNote] = useState("");

  return (
    <Card className="glass-strong p-5 space-y-3 rounded-[28px] border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-readable">{task.business_name ?? "Entreprise"}</h3>
          <p className="text-xs text-readable-muted">
            {[task.city, task.service_category?.replace(/-/g, " ")].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">score {Math.round(task.priority_score ?? 0)}</Badge>
      </div>

      {task.phone && (
        <a href={`tel:${task.phone}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <PhoneCall className="h-4 w-4" /> {task.phone}
        </a>
      )}
      <p className="text-xs text-readable-body">{task.reason}</p>
      {task.suggested_script && (
        <details className="text-xs">
          <summary className="cursor-pointer text-readable-muted">Script suggéré</summary>
          <p className="mt-2 whitespace-pre-line text-readable-body">{task.suggested_script}</p>
        </details>
      )}
      {task.objective && (
        <p className="text-[11px] text-readable-muted">Objectif : {task.objective}</p>
      )}

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Résultat de l'appel (optionnel)"
        rows={2}
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        {[
          { s: "interested", l: "Intéressé" },
          { s: "callback", l: "Rappeler" },
          { s: "not_interested", l: "Refus" },
          { s: "no_answer", l: "Pas de réponse" },
        ].map(({ s, l }) => (
          <Button
            key={s}
            size="sm"
            variant="outline"
            className="rounded-xl text-xs"
            disabled={record.isPending}
            onClick={() => record.mutate({ id: task.id, status: s, outcome_note: note || undefined })}
          >
            {l}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export default function PageAdminFounderCommand() {
  const { data: approvals = [], isLoading: aLoading } = usePendingApprovals();
  const { data: calls = [], isLoading: cLoading } = useCallTasks();
  const { data: tactics = [] } = useTacticPerformance();
  const { data: blockers = [] } = useExceptionalBlockers();
  const { data: activity = [] } = useAutonomyActivity();
  const refreshCalls = useRefreshCallQueue();

  return (
    <AdminLayout>
      <div className="admin-theme space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-readable">Command Center fondateur</h1>
          <p className="text-sm text-readable-muted mt-1">
            Deux actions humaines seulement : approuver et appeler. Le reste tourne, apprend et se répare seul.
          </p>
        </header>

        {/* 1 — APPROBATIONS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-readable">Approbations requises</h2>
            <Badge variant="outline" className="text-[10px]">{approvals.length}</Badge>
          </div>
          {aLoading ? (
            <p className="text-sm text-readable-muted">Chargement…</p>
          ) : approvals.length === 0 ? (
            <Card className="glass-strong rounded-[28px] border-white/10 p-6 text-sm text-readable-muted">
              Aucune décision en attente. Les agents opèrent dans les garde-fous déjà approuvés.
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {approvals.map((a) => <ApprovalCard key={a.id} approval={a} />)}
            </div>
          )}
        </section>

        {/* 2 — APPELS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-readable">Appels à faire</h2>
            <Badge variant="outline" className="text-[10px]">{calls.length}</Badge>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto gap-1.5 rounded-xl text-xs"
              disabled={refreshCalls.isPending}
              onClick={() => refreshCalls.mutate()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshCalls.isPending ? "animate-spin" : ""}`} />
              Reconstruire la liste
            </Button>
          </div>
          {cLoading ? (
            <p className="text-sm text-readable-muted">Chargement…</p>
          ) : calls.length === 0 ? (
            <Card className="glass-strong rounded-[28px] border-white/10 p-6 text-sm text-readable-muted">
              Aucun appel prioritaire en file.
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {calls.map((t) => <CallCard key={t.id} task={t} />)}
            </div>
          )}
        </section>

        {/* Santé autonome */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-strong rounded-[28px] border-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-readable">Ce que le système a appris</h2>
            </div>
            {tactics.length === 0 ? (
              <p className="text-xs text-readable-muted">
                Aucune donnée vérifiée accumulée pour l'instant. Rien n'est inventé.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {tactics.map((t) => (
                  <li key={`${t.tactic_key}-${t.city}-${t.variant}`} className="flex justify-between gap-3">
                    <span className="text-readable-body">
                      {t.tactic_key} · {t.channel ?? "—"} · {t.city ?? "toutes villes"}
                    </span>
                    <span className="text-readable-muted shrink-0">
                      {t.activations}/{t.attempts} activations
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="glass-strong rounded-[28px] border-white/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-readable">Blocages exceptionnels</h2>
            </div>
            {blockers.length === 0 ? (
              <p className="text-xs text-readable-muted">
                Aucun blocage nécessitant une intervention humaine.
              </p>
            ) : (
              <ul className="space-y-3 text-xs">
                {blockers.map((b) => (
                  <li key={b.id}>
                    <p className="text-readable-body font-medium">{b.blocker_title}</p>
                    <p className="text-readable-muted">{b.suggested_resolution ?? b.blocker_message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="glass-strong rounded-[28px] border-white/10 p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-readable">Activité autonome récente</h2>
            </div>
            {activity.length === 0 ? (
              <p className="text-xs text-readable-muted">Aucune activité enregistrée.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {activity.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <Bot className="h-3.5 w-3.5 shrink-0 text-readable-muted mt-0.5" />
                    <span className="text-readable-body">
                      <span className="text-readable-muted">{l.agent_name} · </span>
                      {l.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </AdminLayout>
  );
}
