/**
 * WidgetScarcityTerritory — Dynamic counter: slots remaining per city/category.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ScarcityEntry {
  city_slug: string;
  category_slug: string;
  total_slots: number;
  filled_slots: number;
}

const MOCK_DATA: ScarcityEntry[] = [
  { city_slug: "laval", category_slug: "isolation", total_slots: 5, filled_slots: 4 },
  { city_slug: "montreal", category_slug: "toiture", total_slots: 8, filled_slots: 5 },
  { city_slug: "longueuil", category_slug: "plomberie", total_slots: 4, filled_slots: 2 },
  { city_slug: "terrebonne", category_slug: "asphalte", total_slots: 3, filled_slots: 3 },
];

const CITY_LABELS: Record<string, string> = {
  laval: "Laval",
  montreal: "Montréal",
  longueuil: "Longueuil",
  terrebonne: "Terrebonne",
};

interface Props {
  citySlug?: string;
  categorySlug?: string;
}

export default function WidgetScarcityTerritory({ citySlug, categorySlug }: Props) {
  const [entries, setEntries] = useState<ScarcityEntry[]>(MOCK_DATA);

  useEffect(() => {
    (supabase as any)
      .from("scarcity_tracker")
      .select("*")
      .then(({ data }: any) => {
        if (data && data.length > 0) setEntries(data);
      });
  }, []);

  const filtered = entries.filter(e => {
    if (citySlug && e.city_slug !== citySlug) return false;
    if (categorySlug && e.category_slug !== categorySlug) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      {filtered.map((e, i) => {
        const remaining = e.total_slots - e.filled_slots;
        const isFull = remaining <= 0;
        const isLow = remaining === 1;

        return (
          <motion.div
            key={`${e.city_slug}-${e.category_slug}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs ${
              isFull
                ? "border-red-500/30 bg-red-500/5"
                : isLow
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-border/40 bg-card/60"
            }`}
          >
            {(isFull || isLow) && (
              <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${isFull ? "text-red-400" : "text-yellow-400"}`} />
            )}
            <span className="text-muted-foreground">
              {CITY_LABELS[e.city_slug] ?? e.city_slug} · {e.category_slug}
            </span>
            <span className="ml-auto font-semibold">
              {isFull ? (
                <span className="text-red-400">Complet</span>
              ) : (
                <span className={isLow ? "text-yellow-400" : "text-foreground"}>
                  {remaining} place{remaining > 1 ? "s" : ""}
                </span>
              )}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
