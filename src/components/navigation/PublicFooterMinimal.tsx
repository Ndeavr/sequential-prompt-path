/**
 * UNPRO — Public Footer Minimal
 * One-line footer for the conversion-first public surface.
 */
import { Link } from "react-router-dom";
import UnproLogo from "@/components/brand/UnproLogo";

export default function PublicFooterMinimal() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="w-full mt-auto"
      style={{
        background: "hsl(220 40% 5% / 0.6)",
        borderTop: "1px solid hsl(0 0% 100% / 0.05)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <UnproLogo size={88} animated={false} showWordmark />
          <span>© {year} UNPRO</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link to="/confidentialite" className="hover:text-foreground transition">
            Confidentialité
          </Link>
          <Link to="/conditions" className="hover:text-foreground transition">
            Conditions
          </Link>
          <span>Made in Québec ⚜️</span>
        </nav>
      </div>
    </footer>
  );
}
