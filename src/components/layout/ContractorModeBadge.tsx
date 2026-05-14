/**
 * ContractorModeBadge — Slim "● Mode Pro · Quitter" pill shown when the
 * site is in contractor UI mode. Lets the visitor revert to homeowner.
 */
import { useActiveRole } from "@/contexts/ActiveRoleContext";

export default function ContractorModeBadge() {
  const { activeRole, setActiveRole, clearActiveRole } = useActiveRole();
  if (activeRole !== "contractor") return null;

  const exit = () => {
    // Switch to homeowner explicitly (so guest UI returns to homeowner hero).
    setActiveRole("homeowner");
    // also clear so authed users fall back to their default role
    clearActiveRole();
  };

  return (
    <button
      onClick={exit}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 transition"
      title="Quitter le mode entrepreneur"
    >
      <span className="relative flex w-1.5 h-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-70 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
      </span>
      Mode Pro
      <span className="text-blue-300/60 hover:text-white">· Quitter</span>
    </button>
  );
}
