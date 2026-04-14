import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  cities: { id: string; name: string }[];
  cityId: string;
  onCityChange: (v: string) => void;
  domains: { id: string; name: string }[];
  domainId: string;
  onDomainChange: (v: string) => void;
}

export default function FilterBarCityDomainStatus({
  search, onSearchChange, status, onStatusChange,
  cities, cityId, onCityChange, domains, domainId, onDomainChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Nom, NEQ, téléphone, domaine web..."
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="pending_review">En revue</SelectItem>
          <SelectItem value="approved">Approuvé</SelectItem>
          <SelectItem value="rejected">Rejeté</SelectItem>
          <SelectItem value="merged">Fusionné</SelectItem>
        </SelectContent>
      </Select>
      <Select value={cityId} onValueChange={onCityChange}>
        <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Ville" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={domainId} onValueChange={onDomainChange}>
        <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Domaine" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
