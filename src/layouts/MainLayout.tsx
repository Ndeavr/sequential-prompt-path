/**
 * UNPRO — Main Layout (Premium)
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-surface border-b border-border/40">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-gradient tracking-tight">UNPRO</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-xs rounded-xl h-8">
              <Link to="/search">Entrepreneurs</Link>
            </Button>
            {isAuthenticated ? (
              <Button asChild size="sm" className="text-xs rounded-xl h-8">
                <Link to="/dashboard">Tableau de bord</Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="text-xs rounded-xl h-8">
                <Link to="/login">Connexion</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-5">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} UNPRO — Intelligence immobilière</span>
          <div className="flex items-center gap-4">
            <Link to="/search" className="hover:text-primary transition-colors">Entrepreneurs</Link>
            <Link to="/signup" className="hover:text-primary transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
