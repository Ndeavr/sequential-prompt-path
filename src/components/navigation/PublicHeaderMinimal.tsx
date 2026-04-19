/**
 * UNPRO — Public Header Minimal
 * Conversion-first nav for guests: 3 links + 1 primary CTA.
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import UnproLogo from "@/components/brand/UnproLogo";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/alex-match", label: "Trouver un entrepreneur" },
  { to: "/join", label: "Entrepreneurs" },
  { to: "/login", label: "Connexion" },
];

export default function PublicHeaderMinimal() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "hsl(220 40% 6% / 0.78)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" aria-label="UNPRO — Accueil" className="flex items-center">
          <UnproLogo size={120} animated={false} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors ${
                pathname === item.to
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Button asChild size="sm" className="ml-2">
            <Link to="/alex-match">Commencer</Link>
          </Button>
        </nav>

        {/* Mobile burger */}
        <button
          className="lg:hidden p-2 -mr-2 text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="lg:hidden border-t border-white/5"
          style={{ background: "hsl(220 40% 6% / 0.95)" }}
        >
          <div className="px-4 py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-3 px-2 text-base text-foreground/90 hover:text-foreground rounded-lg hover:bg-white/5 transition"
              >
                {item.label}
              </Link>
            ))}
            <Button
              asChild
              size="lg"
              className="mt-3 w-full"
              onClick={() => setOpen(false)}
            >
              <Link to="/alex-match">Commencer</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
