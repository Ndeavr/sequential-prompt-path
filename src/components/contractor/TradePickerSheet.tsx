/**
 * UNPRO — Sélecteur de métier principal (feuille modale, mobile-first).
 * Remplace le menu natif : recherche, groupes, sous-services en aperçu.
 * La liste vient uniquement de la taxonomie canonique.
 */
import { useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  searchTaxonomy,
  servicesForTrade,
  useTradeTaxonomy,
  type TradeNode,
} from "@/hooks/useTradeTaxonomy";

interface Props {
  /** Slug du métier retenu (ou null). */
  value: string | null;
  onChange: (trade: TradeNode) => void;
  label: string;
  /** Libellé affiché lorsque la valeur ne fait pas partie de la taxonomie. */
  fallbackLabel?: string | null;
  tone?: "dark" | "light";
  placeholder?: string;
  testId?: string;
}

export default function TradePickerSheet({
  value,
  onChange,
  label,
  fallbackLabel,
  tone = "dark",
  placeholder = "Choisir un métier",
  testId = "trade-picker",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { taxonomy, isLoading } = useTradeTaxonomy();

  const selected = value ? taxonomy.bySlug.get(value) ?? null : null;
  const results = useMemo(() => searchTaxonomy(taxonomy, query), [taxonomy, query]);

  const dark = tone === "dark";
  const display = selected?.label ?? fallbackLabel ?? null;

  return (
    <div className="block">
      <span
        className={cn(
          "text-xs uppercase tracking-wider",
          dark ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen(true)}
        className={cn(
          "mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm",
          dark
            ? "border border-white/10 bg-black/30 text-white"
            : "border border-border bg-background text-foreground",
        )}
      >
        <span className={cn("truncate", !display && (dark ? "text-white/30" : "text-muted-foreground"))}>
          {display ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[28px] p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <SheetTitle>Votre métier principal</SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un métier ou un service…"
                aria-label="Rechercher un métier"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
          </div>

          <div className="h-[calc(85vh-9rem)] overflow-y-auto px-5 pb-8">
            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des métiers…
              </div>
            ) : results.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                Aucun métier ne correspond à cette recherche.
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((trade) => {
                  const kids = servicesForTrade(taxonomy, trade.slug);
                  const isSelected = trade.slug === value;
                  return (
                    <li key={trade.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(trade);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex-1 text-sm font-medium text-foreground">{trade.label}</span>
                          {isSelected && <Check className="h-4 w-4 text-primary" aria-hidden />}
                        </span>
                        {kids.length > 0 && (
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {kids.slice(0, 4).map((k) => k.label).join(" · ")}
                            {kids.length > 4 ? " …" : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
