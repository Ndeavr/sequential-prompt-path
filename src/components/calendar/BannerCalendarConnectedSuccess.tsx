/**
 * BannerCalendarConnectedSuccess — confirmation banner.
 */
import { CheckCircle2 } from "lucide-react";
import type { CalendarConnection } from "@/hooks/useCalendarConnection";

export default function BannerCalendarConnectedSuccess({ conn }: { conn: CalendarConnection }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-emerald-200">Calendrier connecté</p>
        <p className="text-xs text-emerald-300/80 mt-0.5">
          {conn.provider === "google" ? "Google Calendar" : conn.provider === "apple" ? "Apple Calendar (abonnement)" : conn.provider}
          {conn.provider_account_email ? ` · ${conn.provider_account_email}` : ""}
        </p>
      </div>
    </div>
  );
}
