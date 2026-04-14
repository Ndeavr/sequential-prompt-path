import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useProfileCompleteness } from "@/hooks/useProfileCompleteness";
import InputAutoSaveField from "./InputAutoSaveField";
import WidgetProfileCompletionProgress from "./WidgetProfileCompletionProgress";
import BadgeProfileCompleteState from "./BadgeProfileCompleteState";
import { useProfile } from "@/hooks/useProfile";

const FIELD_CONFIG: Record<string, { label: string; placeholder: string; type?: string }> = {
  first_name: { label: "Prénom", placeholder: "Jean" },
  phone: { label: "Téléphone", placeholder: "514-555-1234", type: "tel" },
  email: { label: "Courriel", placeholder: "jean@exemple.com", type: "email" },
  address_line_1: { label: "Adresse", placeholder: "123 rue Principale" },
  city: { label: "Ville", placeholder: "Montréal" },
  postal_code: { label: "Code postal", placeholder: "H2X 1Y4" },
};

export default function DrawerProfileQuickEdit() {
  const { drawerOpen, setDrawerOpen, missingFields, score, isComplete, updateField } =
    useProfileCompleteness();
  const { data: profile } = useProfile();

  return (
    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base">Compléter mon profil</DrawerTitle>
            <BadgeProfileCompleteState isComplete={isComplete} score={score} />
          </div>
          <DrawerDescription className="text-xs">
            Ces informations permettent de te proposer le bon professionnel et de réserver.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          <WidgetProfileCompletionProgress score={score} />

          {missingFields.map((field) => {
            const config = FIELD_CONFIG[field];
            if (!config) return null;
            const currentVal = profile?.[field as keyof typeof profile] as string | undefined;
            return (
              <InputAutoSaveField
                key={field}
                field={field}
                label={config.label}
                placeholder={config.placeholder}
                type={config.type}
                initialValue={currentVal ?? ""}
                onSave={updateField}
              />
            );
          })}

          {missingFields.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm font-medium text-foreground">Profil complété! 🎉</p>
              <p className="text-xs text-muted-foreground">
                Tu peux maintenant réserver un rendez-vous.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
