const ORIGIN_LABEL: Record<string, string> = {
  partner_added: "Ajouté par vous",
  admin_assigned: "Attribué par UNPRO",
  partner_generated: "Généré par votre lien",
  imported_with_permission: "Importé (permission)",
};
const ORIGIN_CLASS: Record<string, string> = {
  partner_added: "bg-white/10 text-white/70 border-white/15",
  admin_assigned: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  partner_generated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  imported_with_permission: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

export function LeadOriginBadge({ origin }: { origin?: string | null }) {
  const k = origin || "partner_added";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ORIGIN_CLASS[k] || ORIGIN_CLASS.partner_added}`}>
      {ORIGIN_LABEL[k] || k}
    </span>
  );
}
