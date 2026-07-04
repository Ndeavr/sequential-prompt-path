/**
 * PageRegistrationSuccess — routes newly-created accounts to the correct
 * canonical onboarding surface. Never a dead end.
 */
import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageShell from "@/layouts/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { resolveDestinationForRole } from "@/config/routeRegistry";

type Role = "homeowner" | "contractor" | "condo_manager";

export default function PageRegistrationSuccess() {
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const r = (data.user?.user_metadata?.role as Role | undefined) ?? null;
      setRole(r);
      setReady(true);
    })();
  }, []);

  if (ready && role) {
    return <Navigate to={resolveDestinationForRole(role)} replace />;
  }

  const options: { role: Role; icon: string; title: string; sub: string; href: string }[] = [
    { role: "homeowner", icon: "🏠", title: "Je suis propriétaire", sub: "Décrire un problème à Alex", href: "/alex" },
    { role: "contractor", icon: "🔨", title: "Je suis entrepreneur", sub: "Activer mon profil", href: "/entrepreneurs" },
    { role: "condo_manager", icon: "🏢", title: "Je gère un immeuble", sub: "Ouvrir le module copropriété", href: "/condo" },
  ];

  return (
    <PageShell id="welcome" variant="app" cta={false}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-white">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Bienvenue sur UNPRO.
        </h1>
        <p className="mt-2 text-white/70">Choisissez la porte qui vous concerne.</p>

        <div className="mt-8 grid gap-4">
          {options.map((o) => (
            <Link
              key={o.role}
              to={o.href}
              data-cta-canonical={o.role === "contractor" ? "activate_profile" : o.role === "homeowner" ? "alex" : "alex"}
              className="group flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:-translate-y-[2px] hover:border-white/20"
            >
              <span className="text-3xl">{o.icon}</span>
              <span>
                <span className="block text-lg font-medium">{o.title}</span>
                <span className="block text-sm text-white/60">{o.sub}</span>
              </span>
              <span className="ml-auto text-white/40 transition-colors group-hover:text-white">→</span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
