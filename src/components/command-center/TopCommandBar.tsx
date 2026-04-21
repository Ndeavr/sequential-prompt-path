/**
 * UNPRO — Command Center Top Bar
 */
import { Search, Upload, Rocket, Send, Flame, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CommandCenterFilters } from "@/hooks/useCommandCenterData";

type Props = {
  filters: CommandCenterFilters;
  onFiltersChange: (f: CommandCenterFilters) => void;
  cities: string[];
  categories: string[];
  onImport?: () => void;
  onRefresh?: () => void;
};

export default function TopCommandBar({ filters, onFiltersChange, cities, categories, onImport, onRefresh }: Props) {
  const update = (patch: Partial<CommandCenterFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-xs text-muted-foreground">Pipeline, chaleur, territoires et prochaines actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            className="pl-8 h-9 w-44 text-xs bg-muted/10 border-border/30"
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
          />
        </div>

        <Select value={filters.city} onValueChange={v => update({ city: v })}>
          <SelectTrigger className="h-9 w-32 text-xs bg-muted/10 border-border/30">
            <SelectValue placeholder="Ville" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={v => update({ category: v })}>
          <SelectTrigger className="h-9 w-32 text-xs bg-muted/10 border-border/30">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Switch checked={filters.founderOnly} onCheckedChange={v => update({ founderOnly: v })} />
          <span className="text-xs text-muted-foreground">Fondateur</span>
        </div>

        {onImport && (
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5" onClick={onImport}>
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
        )}
        {onRefresh && (
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onRefresh}>
            Rafraîchir
          </Button>
        )}
      </div>
    </div>
  );
}
