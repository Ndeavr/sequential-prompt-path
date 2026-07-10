/**
 * UNPRO — /admin/contractor/:id
 * Full journey drilldown for a single contractor.
 */
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useContractorJourney, analyzeAbandonment, stageLabelFr } from "@/hooks/useContractorJourney";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import StageChecklist from "@/components/admin/forensics/StageChecklist";
import EventTimeline from "@/components/admin/forensics/EventTimeline";
import AbandonmentReasonCard from "@/components/admin/forensics/AbandonmentReasonCard";
import LastKnownPageCard from "@/components/admin/forensics/LastKnownPageCard";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default function PageContractorForensics() {
  useAdminPageTracking();
  const { id } = useParams<{ id: string }>();
  const decodedId = id ? decodeURIComponent(id) : undefined;
  const { data, isLoading } = useContractorJourney(decodedId);

  if (isLoading) {
    return (
      <div className="admin-theme min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-readable-muted">Chargement…</div>
      </div>
    );
  }

  if (!data?.state) {
    return (
      <div className="admin-theme min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link to="/admin/contacted-contractors" className="text-sm text-readable-muted hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Retour
          </Link>
          <div className="mt-6 rounded-xl border border-border/20 bg-card/20 p-6">
            <h1 className="text-lg font-semibold mb-2">Journey introuvable</h1>
            <p className="text-sm text-readable-muted">Aucun événement trouvé pour <span className="font-mono">{decodedId}</span>.</p>
          </div>
        </div>
      </div>
    );
  }

  const { state, events } = data;
  const analysis = analyzeAbandonment(state, events);
  const identity = state.company_name || state.phone || state.email || state.contractor_id || decodedId || "Contractor";

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin/contacted-contractors" className="text-sm text-readable-muted hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Retour à la liste
      </Link>

      {/* Identity */}
      <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-5 mb-6">
        <div className="flex flex-wrap gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold text-readable">{identity}</h1>
            <div className="mt-2 text-sm text-readable-muted space-y-0.5">
              {state.phone && <div>📱 {state.phone}</div>}
              {state.email && <div>✉️ {state.email}</div>}
              {state.contractor_id && <div className="font-mono text-xs">ID: {state.contractor_id}</div>}
              <div>Journey key: <span className="font-mono text-xs">{state.journey_key}</span></div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-readable-muted">Étape actuelle</div>
            <div className="text-xl font-bold mt-0.5 text-readable">{stageLabelFr(state.current_stage)}</div>
            <div className="text-xs text-readable-muted mt-2">
              1re activité: {formatDate(state.first_activity_at)}<br />
              Dernière: {formatDate(state.last_activity_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Prominent last-known page */}
      <div className="mb-6">
        <LastKnownPageCard path={state.last_known_path} />
      </div>

      {/* Grid: checklist + abandonment + timeline */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          <StageChecklist state={state} />
          <AbandonmentReasonCard analysis={analysis} />
        </div>
        <EventTimeline events={events} />
      </div>
      </div>
    </div>
  );
}
