/**
 * /admin/site-health — visual stability diagnostics (admin only).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getVisualStabilitySnapshot,
  clearVisualStability,
  type VisualEvent,
} from "@/lib/visualStabilityLogger";

type ProbeState = "idle" | "ok" | "fail";
interface Probes {
  supabase: ProbeState;
  publicAsset: ProbeState;
  storage: ProbeState;
}

const TEST_ROUTES = [
  "/",
  "/contractors",
  "/project/new",
  "/waiting",
  "/onboarding",
  "/contractor/onboarding",
  "/admin",
  "/admin/ops",
  "/admin/acquisition-funnel",
  "/admin/normalization",
];

// Routes that must redirect to a real page (not the "coming soon" fallback).
const REDIRECTED_ROUTES: Array<{ from: string; to: string }> = [
  { from: "/home", to: "/" },
  { from: "/matches", to: "/" },
];

export default function PageAdminSiteHealth() {
  const [snap, setSnap] = useState(() => getVisualStabilitySnapshot());
  const [probes, setProbes] = useState<Probes>({
    supabase: "idle",
    publicAsset: "idle",
    storage: "idle",
  });

  const refresh = () => setSnap(getVisualStabilitySnapshot());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Supabase probe — cheap public table read that always exists.
      try {
        const { error } = await supabase.from("plans").select("id").limit(1);
        if (!cancelled) setProbes((p) => ({ ...p, supabase: error ? "fail" : "ok" }));
      } catch {
        if (!cancelled) setProbes((p) => ({ ...p, supabase: "fail" }));
      }
      // Public asset probe
      try {
        const r = await fetch("/placeholder.svg", { method: "HEAD" });
        if (!cancelled) setProbes((p) => ({ ...p, publicAsset: r.ok ? "ok" : "fail" }));
      } catch {
        if (!cancelled) setProbes((p) => ({ ...p, publicAsset: "fail" }));
      }
      // Storage probe
      try {
        const { data } = supabase.storage.from("public").getPublicUrl("logo.png");
        const r = await fetch(data.publicUrl, { method: "HEAD" });
        if (!cancelled) setProbes((p) => ({ ...p, storage: r.ok ? "ok" : "fail" }));
      } catch {
        if (!cancelled) setProbes((p) => ({ ...p, storage: "fail" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const brokenImages = snap.events.filter((e) => e.type === "image_load_failed");
  const emptySrcs = snap.events.filter((e) => e.type === "empty_image_src");
  const timeouts = snap.events.filter((e) => e.type === "component_data_timeout");
  const remounts = snap.events.filter((e) => e.type === "repeated_mount_detected");
  const emptySections = snap.events.filter((e) => e.type === "section_rendered_empty");

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Site Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnostics visuels côté client — sessionStorage, non exposé au public.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            Rafraîchir
          </button>
          <button
            onClick={() => {
              clearVisualStability();
              refresh();
            }}
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted"
          >
            Vider le buffer
          </button>
          <Link
            to="/admin/ops"
            className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted"
          >
            ← Admin Ops
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Images cassées" value={brokenImages.length} tone={brokenImages.length ? "warn" : "ok"} />
        <Metric label="src vides" value={emptySrcs.length} tone={emptySrcs.length ? "warn" : "ok"} />
        <Metric label="Timeouts data" value={timeouts.length} tone={timeouts.length ? "warn" : "ok"} />
        <Metric label="Remounts répétés" value={remounts.length} tone={remounts.length ? "warn" : "ok"} />
        <Metric label="Sections vides" value={emptySections.length} tone={emptySections.length ? "warn" : "ok"} />
      </section>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-semibold text-lg">Sondes de connectivité</h2>
        <ul className="space-y-2 text-sm">
          <ProbeRow label="Base de données (Cloud)" state={probes.supabase} />
          <ProbeRow label="Asset public (/placeholder.svg)" state={probes.publicAsset} />
          <ProbeRow label="Storage (bucket public)" state={probes.storage} />
        </ul>
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-lg mb-3">Événements récents</h2>
        {snap.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement capturé pour cette session.</p>
        ) : (
          <EventTable events={[...snap.events].reverse().slice(0, 50)} />
        )}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-lg mb-3">Dernières erreurs console ({snap.errors.length})</h2>
        {snap.errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune erreur capturée.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono max-h-72 overflow-auto">
            {[...snap.errors].reverse().map((e, i) => (
              <li key={i} className="border-b border-border/40 py-1">
                <span className="text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>{" "}
                {e.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="font-semibold text-lg mb-3">Routes à tester</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TEST_ROUTES.map((r) => (
            <a
              key={r}
              href={r}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted truncate"
            >
              {r}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone === "warn" ? "text-amber-500" : "text-emerald-500"}`}>
        {value}
      </div>
    </div>
  );
}

function ProbeRow({ label, state }: { label: string; state: ProbeState }) {
  const color =
    state === "ok"
      ? "text-emerald-500"
      : state === "fail"
        ? "text-red-500"
        : "text-muted-foreground";
  const dot = state === "ok" ? "●" : state === "fail" ? "✕" : "○";
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`font-mono ${color}`}>
        {dot} {state}
      </span>
    </li>
  );
}

function EventTable({ events }: { events: VisualEvent[] }) {
  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 pr-3">Heure</th>
            <th className="py-1 pr-3">Type</th>
            <th className="py-1">Détails</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-t border-border/40">
              <td className="py-1 pr-3 font-mono">{new Date(e.at).toLocaleTimeString()}</td>
              <td className="py-1 pr-3">{e.type}</td>
              <td className="py-1 font-mono truncate max-w-md">{JSON.stringify(e.payload)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
