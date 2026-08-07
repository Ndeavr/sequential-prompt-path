import { ISR_BRAND } from "@/config/isrDemoConfig";

export default function IsrIdentityCard() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:p-6 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/70">Démo entrepreneur</div>
          <div className="mt-1 text-xl sm:text-2xl font-semibold tracking-[-0.03em]">{ISR_BRAND.company}</div>
          <div className="text-sm text-white/60">{ISR_BRAND.legal}</div>
        </div>
        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-medium text-amber-200">
          Domination target
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/80">
        <div><span className="text-white/50">Site · </span>{ISR_BRAND.website}</div>
        <div><span className="text-white/50">Positionnement · </span>{ISR_BRAND.positioning}</div>
        <div><span className="text-white/50">Territoire · </span>{ISR_BRAND.territory}</div>
        <div><span className="text-white/50">Téléphones · </span>{ISR_BRAND.phones.join(" / ")}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {ISR_BRAND.services.map((s) => (
          <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/70">{s}</span>
        ))}
      </div>
    </div>
  );
}
