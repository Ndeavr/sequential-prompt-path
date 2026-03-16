/**
 * PropertySelect — Shared property dropdown with:
 * - Empty state: "Ajouter une propriété" button
 * - 3+ properties: "Compte gestionnaire" upsell message
 * - Always shows "Ajouter une propriété" option at bottom
 */
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";

const MAX_FREE_PROPERTIES = 3;

interface PropertyOption {
  id: string;
  address: string;
}

interface PropertySelectProps {
  value: string;
  onChange: (value: string) => void;
  properties: PropertyOption[] | undefined | null;
  placeholder?: string;
  optional?: boolean;
}

export default function PropertySelect({
  value,
  onChange,
  properties,
  placeholder = "Sélectionnez une propriété",
  optional = false,
}: PropertySelectProps) {
  const navigate = useNavigate();
  const list = properties ?? [];
  const hasProperties = list.length > 0;
  const atLimit = list.length >= MAX_FREE_PROPERTIES;

  if (!hasProperties && !optional) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => navigate("/dashboard/properties/new")}
        >
          <Plus className="h-4 w-4 text-primary" />
          Ajouter une propriété
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === "__new__") {
            navigate("/dashboard/properties/new");
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {list.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.address}
            </SelectItem>
          ))}
          {!atLimit && (
            <SelectItem value="__new__">
              <span className="flex items-center gap-2 text-primary">
                <Plus className="h-3.5 w-3.5" />
                Ajouter une propriété
              </span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {atLimit && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          Vous gérez {list.length}+ propriétés? Passez à un{" "}
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            compte gestionnaire
          </button>
          .
        </p>
      )}

      {!hasProperties && optional && (
        <p className="text-xs text-muted-foreground">
          Pas de propriété?{" "}
          <button
            type="button"
            onClick={() => navigate("/dashboard/properties/new")}
            className="text-primary underline underline-offset-2"
          >
            Ajoutez-en une
          </button>{" "}
          ou continuez sans.
        </p>
      )}
    </div>
  );
}
