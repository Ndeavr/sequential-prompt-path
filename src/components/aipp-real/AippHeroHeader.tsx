import type { AippAuditViewModel } from "@/types/aippReal";

export default function AippHeroHeader({ model }: { model: AippAuditViewModel }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold">
        Indice AIPP de {model.companyName}
      </h1>
      <p className="text-muted-foreground">
        Votre capacité à être trouvé, compris et choisi.
      </p>
      {model.lastUpdatedAt && (
        <p className="text-xs text-muted-foreground">
          Dernière mise à jour : {new Date(model.lastUpdatedAt).toLocaleDateString("fr-CA", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
