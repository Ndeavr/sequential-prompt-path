/**
 * UNPRO Condos — Premium Condo Dashboard Layout (Multi-Role)
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCondoRole, useCondoRoleState, CondoRoleProvider } from "@/hooks/useCondoRole";
import CondoRoleSwitcher from "@/components/condo/CondoRoleSwitcher";
import { Button } from "@/components/ui/button";
import {
  Building2, LayoutDashboard, Puzzle, Wrench, FolderOpen,
  PiggyBank, FileBarChart, Receipt, Settings, LogOut,
  ChevronRight, Menu, X, Users, Vote, AlertTriangle,
  Calendar, DollarSign, ClipboardList
} from "lucide-react";
import { useState, useMemo, type ReactNode } from "react";

interface NavEntry {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: ("condo_owner" | "condo_manager" | "condo_board")[];
}

const allNavItems: NavEntry[] = [
  { to: "/condos/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["condo_owner", "condo_manager", "condo_board"] },
  { to: "/condos/building", label: "Profil immeuble", icon: Building2, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/units", label: "Mes unités", icon: Puzzle, roles: ["condo_owner"] },
  { to: "/condos/units", label: "Unités", icon: Puzzle, roles: ["condo_manager"] },
  { to: "/condos/requests", label: "Mes demandes", icon: ClipboardList, roles: ["condo_owner"] },
  { to: "/condos/requests", label: "Demandes", icon: ClipboardList, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/contractors", label: "Entrepreneurs", icon: Users, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/maintenance", label: "Entretien", icon: Wrench, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/components", label: "Composantes", icon: Puzzle, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/incidents", label: "Incidents", icon: AlertTriangle, roles: ["condo_owner", "condo_manager"] },
  { to: "/condos/documents", label: "Documents", icon: FolderOpen, roles: ["condo_owner", "condo_manager", "condo_board"] },
  { to: "/condos/financials", label: "Finances", icon: DollarSign, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/reserve-fund", label: "Fonds de prévoyance", icon: PiggyBank, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/voting", label: "Votes & décisions", icon: Vote, roles: ["condo_board"] },
  { to: "/condos/quotes", label: "Soumissions", icon: Receipt, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/calendar", label: "Calendrier", icon: Calendar, roles: ["condo_owner", "condo_manager", "condo_board"] },
  { to: "/condos/reports", label: "Rapports", icon: FileBarChart, roles: ["condo_manager", "condo_board"] },
  { to: "/condos/billing", label: "Facturation", icon: Settings, roles: ["condo_board"] },
];

function CondoLayoutInner({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { condoRole } = useCondoRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(condoRole)),
    [condoRole]
  );

  const roleColor = condoRole === "condo_board" ? "from-amber-500 to-orange-500"
    : condoRole === "condo_manager" ? "from-secondary to-primary"
    : "from-primary to-secondary";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border/30 bg-card/40 backdrop-blur-sm">
        <Link to="/condos" className="flex items-center gap-2.5 px-5 py-5 border-b border-border/20">
          <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${roleColor} flex items-center justify-center shadow-glow`}>
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display text-sm font-bold text-foreground">UNPRO</span>
            <span className="font-display text-xs text-muted-foreground ml-1">Condos</span>
          </div>
        </Link>

        {/* Role switcher */}
        <div className="px-3 py-3 border-b border-border/20">
          <CondoRoleSwitcher />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map((item, idx) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            // Deduplicate by checking if there's already one with same `to` rendered
            const isDuplicate = navItems.findIndex(n => n.to === item.to) !== idx;
            if (isDuplicate) return null;
            return (
              <Link
                key={item.to + item.label}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/20">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/80 backdrop-blur-xl border-b border-border/30 flex items-center px-4">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -ml-2">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-bold">UNPRO Condos</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-14 overflow-y-auto">
          <div className="p-4">
            <div className="mb-4">
              <CondoRoleSwitcher />
            </div>
            <nav className="space-y-1">
              {navItems.map((item, idx) => {
                const active = pathname === item.to;
                const isDuplicate = navItems.findIndex(n => n.to === item.to) !== idx;
                if (isDuplicate) return null;
                return (
                  <Link
                    key={item.to + item.label}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

const CondoLayout = ({ children }: { children: ReactNode }) => {
  const roleState = useCondoRoleState();

  return (
    <CondoRoleProvider value={roleState}>
      <CondoLayoutInner>{children}</CondoLayoutInner>
    </CondoRoleProvider>
  );
};

export default CondoLayout;
