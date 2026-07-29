/**
 * UNPRO — Revenue Wall
 * Sticky ribbon injected in AdminLayout header. Real numbers from v_launch_funnel.
 * Purpose: every admin page shows today's revenue vs $5 goal.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { DollarSign, Rocket } from "lucide-react";

const GOAL = 5;

export default function RevenueWall() {
  const [paid, setPaid] = useState<number>(0);
  const [activated, setActivated] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await (supabase as any).from("v_launch_funnel").select("payments_today,activations_today").maybeSingle();
      if (!alive || !data) return;
      setPaid(Number(data.payments_today ?? 0));
      setActivated(Number(data.activations_today ?? 0));
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const remaining = Math.max(0, GOAL - paid);
  const hit = remaining === 0;

  return (
    <Link
      to="/admin/launch-control"
      className={`flex items-center justify-between gap-3 px-4 py-1.5 text-[11px] border-b border-border/40 ${
        hit ? "bg-emerald-500/10 text-emerald-300" : paid > 0 ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
      } hover:bg-primary/15 transition`}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <DollarSign className="h-3 w-3" />
        Aujourd'hui : <span className="tabular-nums font-bold">${paid}</span> / ${GOAL}
      </span>
      <span className="tabular-nums">
        {hit ? "🎉 Objectif atteint" : `${remaining} contrat${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
        <span className="mx-1.5 opacity-40">·</span>
        {activated} activé{activated !== 1 ? "s" : ""}
      </span>
      <span className="hidden sm:flex items-center gap-1 opacity-80">
        <Rocket className="h-3 w-3" /> Launch Control
      </span>
    </Link>
  );
}
