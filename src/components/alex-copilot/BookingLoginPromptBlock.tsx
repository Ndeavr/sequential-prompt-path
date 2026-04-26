/**
 * BookingLoginPromptBlock — premium glassmorphism block shown in place
 * of any contact form when the user is not logged in.
 *
 * Preserves the in-progress booking selection (date + time slot) by
 * stashing it in sessionStorage so it can be restored after login.
 */
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export interface PendingBookingDraft {
  proId?: string | null;
  date: string | null;
  slot: string | null;
  notes?: string | null;
}

const STORAGE_KEY = "unpro:pending-booking";

export function savePendingBooking(draft: PendingBookingDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* noop */
  }
}

export function loadPendingBooking(): PendingBookingDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingBookingDraft;
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

interface Props {
  draft: PendingBookingDraft;
}

export default function BookingLoginPromptBlock({ draft }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const goAuth = (mode: "login" | "signup") => {
    savePendingBooking(draft);
    navigate(mode === "login" ? "/login" : "/signup", {
      state: { from: location.pathname, intent: "booking" },
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl p-5 space-y-4 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-sky-300" />
        </div>
        <h3 className="text-[15px] font-semibold text-white leading-tight">
          Connectez-vous pour confirmer votre rendez-vous
        </h3>
      </div>

      <p className="text-[13px] leading-relaxed text-white/70">
        Pour éviter de vous redemander vos coordonnées à chaque fois, UNPRO les garde
        dans votre profil sécurisé.
      </p>

      <div className="space-y-2">
        <Button
          onClick={() => goAuth("login")}
          className="w-full h-11 rounded-xl text-[14px] font-semibold bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] text-white"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Me connecter
        </Button>
        <Button
          onClick={() => goAuth("signup")}
          variant="outline"
          className="w-full h-11 rounded-xl text-[14px] font-semibold bg-white/5 border-white/15 text-white hover:bg-white/10"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Créer mon compte gratuit
        </Button>
      </div>

      <p className="text-[11px] text-white/40 text-center">
        Vos sélections (date, plage) sont conservées.
      </p>
    </div>
  );
}
