/**
 * UNPRO Admin — Territory Authority
 * Shows AI authority slot occupancy per city × specialty.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TerritoryScarcityCard from "@/features/aiTrust/components/TerritoryScarcityCard";

export default function PageAdminAiTrustTerritory() {
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["admin", "ai-trust", "territory_slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_slots" as any)
        .select("*")
        .order("city");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="intel-theme min-h-screen bg-[#050816] text-foreground">
      <header className="border-b border-white/5 px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
          UNPRO Admin · Territory
        </p>
        <h1 className="text-2xl font-semibold mt-1">Authority Slot Occupancy</h1>
      </header>

      <main className="p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && slots.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
            Aucun territoire indexé. Lancez l'orchestrateur de génération de territoires.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {slots.map((s) => (
            <TerritoryScarcityCard
              key={s.id}
              city={s.city}
              specialty={s.specialty}
              totalSlots={s.total_slots ?? 5}
              takenSlots={s.taken_slots ?? 0}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
