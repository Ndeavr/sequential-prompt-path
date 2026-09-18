import { Bot, BriefcaseBusiness, CalendarCheck2, Check, FileCheck2, Home, MapPin, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { ViewportPanel } from "./ScrollStory";

export function ContractorIntelligenceVisual() {
  return (
    <ViewportPanel className="min-h-[360px]" tone="default">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary" /><span className="font-semibold">Clara comprend l’entreprise</span></div>
        <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary-tint">À confirmer</span>
      </div>
      <div className="mt-6 space-y-4">
        {[{ icon: Wrench, label: "Métier et services" }, { icon: MapPin, label: "Territoire desservi" }, { icon: BriefcaseBusiness, label: "Projets recherchés" }, { icon: ShieldCheck, label: "Signaux de confiance" }].map(({ icon: Icon, label }, index) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-4">
            <Icon className="h-5 w-5 text-primary" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <span className="text-xs text-readable-soft">{index < 2 ? "Déclaré" : "À confirmer"}</span>
          </div>
        ))}
      </div>
    </ViewportPanel>
  );
}

export function ServicePriorityVisual() {
  const groups = [
    { label: "PRIORITAIRE", items: ["Service principal", "Projet recherché"] },
    { label: "ACCEPTÉ", items: ["Service connexe"] },
    { label: "NON RECHERCHÉ", items: ["Exclusion explicite"] },
  ];
  return (
    <ViewportPanel>
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-tint">Vos préférences</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <div key={group.label} className="rounded-lg border border-border/70 bg-muted/25 p-3">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-readable-soft">{group.label}</p>
            <div className="mt-3 space-y-2">
              {group.items.map((item) => <div key={item} className="rounded-md border border-border/70 bg-card px-3 py-2 text-xs">{item}</div>)}
            </div>
          </div>
        ))}
      </div>
    </ViewportPanel>
  );
}

export function PreparedProjectVisual() {
  return (
    <ViewportPanel tone="accent">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15"><Home className="h-5 w-5 text-primary" /></div>
        <div><p className="font-semibold">Projet préparé</p><p className="mt-1 text-sm text-readable-soft">Besoin, contexte, budget, échéancier et préférences.</p></div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["Besoin compris", "Contexte structuré", "Compatibilité analysée", "Disponibilité revalidée"].map((label) => (
          <div key={label} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{label}</div>
        ))}
      </div>
      <div className="mt-7 flex items-center gap-3 border-t border-border/70 pt-5"><CalendarCheck2 className="h-5 w-5 text-primary" /><strong>Un rendez-vous exclusif</strong></div>
    </ViewportPanel>
  );
}

export function PassportLayersVisual() {
  return (
    <ViewportPanel className="min-h-[420px]">
      <div className="flex items-center gap-3 border-b border-border/70 pb-4"><Home className="h-5 w-5 text-primary" /><strong>Passeport Maison</strong></div>
      <div className="mt-6 space-y-3">
        {["Photos et documents", "Équipements", "Travaux et intervenants", "Entretien et observations"].map((label, index) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/25 p-4" style={{ marginLeft: `${index * 8}px` }}>
            <FileCheck2 className="h-5 w-5 text-primary" /><span className="text-sm">{label}</span><span className="ml-auto text-xs text-readable-soft">{index === 0 ? "Déclaré" : "À confirmer"}</span>
          </div>
        ))}
      </div>
    </ViewportPanel>
  );
}

export function TrustFlowVisual() {
  return (
    <ViewportPanel>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ icon: Bot, title: "Comprendre" }, { icon: ShieldCheck, title: "Vérifier" }, { icon: CalendarCheck2, title: "Recommander" }].map(({ icon: Icon, title }, index) => (
          <div key={title} className="relative rounded-lg border border-border/70 bg-muted/25 p-5 text-center">
            <Icon className="mx-auto h-6 w-6 text-primary" /><p className="mt-3 font-semibold">{title}</p>
            {index < 2 && <span aria-hidden className="absolute -right-2 top-1/2 hidden h-px w-4 bg-primary/50 sm:block" />}
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-readable-soft">La conformité et les preuves disponibles passent avant toute recommandation.</p>
    </ViewportPanel>
  );
}