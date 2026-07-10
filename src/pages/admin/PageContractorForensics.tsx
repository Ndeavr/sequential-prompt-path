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
    return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!data?.state) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/admin/contacted-contractors" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Retour
        </Link>
        <div className="mt-6 rounded-xl border border-border/20 bg-card/20 p-6">
          <h1 className="text-lg font-semibold mb-2">Journey introuvable</h1>
          <p className="text-sm text-muted-foreground">Aucun événement trouvé pour <span className="font-mono">{decodedId}</span>.</p>
        </div>
      </div>
    );
  }

  const { state, events } = data;
  const analysis = analyzeAbandonment(state, events);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin/contacted-contractors" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3 h-3" /> Retour à la liste
      </Link>

      {/* Identity */}
      <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-5 mb-6">
        <div className="flex flex-wrap gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-bold">{state.company_name || state.phone || state.email || "Contractor inconnu"}</h1>
            <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
              {state.phone && <div>📱 {state.phone}</div>}
              {state.email && <div>✉️ {state.email}</div>}
              {state.contractor_id && <div className="font-mono text-xs">ID: {state.contractor_id}</div>}
              <div>Journey key: <span className="font-mono text-xs">{state.journey_key}</span></div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Étape actuelle</div>
            <div className="text-xl font-bold mt-0.5">{stageLabelFr(state.current_stage)}</div>
            <div className="text-xs text-muted-foreground mt-2">
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
  );
}
