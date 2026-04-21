export default function AippConversionCard() {
  return (
    <div className="glass-card p-6 space-y-4 border-primary/20">
      <h3 className="font-semibold text-lg">
        Vous avez du potentiel. Vos signaux ne le montrent pas encore assez.
      </h3>
      <p className="text-sm text-muted-foreground">
        UNPRO peut corriger vos 3 blocages prioritaires et transformer votre présence en profil plus visible, plus crédible et plus prêt à convertir.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition">
          Corriger maintenant
        </button>
        <button className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition">
          Parler à Alex
        </button>
      </div>
    </div>
  );
}
