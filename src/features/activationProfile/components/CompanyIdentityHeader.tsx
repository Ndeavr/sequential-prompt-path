/**
 * CompanyIdentityHeader — the first thing a contractor sees.
 * Real logo when UNPRO legitimately has one, otherwise an elegant monogram.
 * Never a broken image, never a placeholder that pretends to be a logo.
 */
import { useState } from "react";
import { MapPin, Wrench } from "lucide-react";
import type { ActivationProfile } from "../types";

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "U").concat(words[1]?.[0] ?? "").toUpperCase();
}

export default function CompanyIdentityHeader({ profile }: { profile: ActivationProfile }) {
  const name = profile.display_name ?? "Votre entreprise";
  const [logoBroken, setLogoBroken] = useState(false);
  const showLogo = Boolean(profile.logo_url) && !logoBroken;

  return (
    <header className="flex items-start gap-4">
      {showLogo ? (
        <img
          src={profile.logo_url as string}
          alt={`Logo de ${name}`}
          loading="eager"
          onError={() => setLogoBroken(true)}
          className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 bg-white/5 object-contain p-1.5"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-sky-400/20 to-cyan-300/10 text-xl font-semibold text-white"
        >
          {initials(name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
          {name}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/65">
          {profile.trade && (
            <span className="inline-flex items-center gap-1">
              <Wrench className="h-3 w-3" aria-hidden /> {profile.trade}
            </span>
          )}
          {profile.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden /> {profile.city}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
