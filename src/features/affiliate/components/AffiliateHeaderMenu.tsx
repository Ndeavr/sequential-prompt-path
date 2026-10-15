/**
 * AffiliateHeaderMenu — role switch + logout + short login copy.
 * Used in the affiliate war room header.
 */
import { CONTRACTOR_ENTRY_PATH } from "@/config/contractorFunnel";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserCircle2, LogOut, RefreshCcw, Copy, LayoutDashboard, Briefcase, Home, Shield } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; icon: any; to: string }> = {
  homeowner: { label: "Espace propriétaire", icon: Home, to: "/dashboard" },
  contractor: { label: "Espace entrepreneur", icon: Briefcase, to: "/pro" },
  affiliate: { label: "Espace affilié", icon: UserCircle2, to: "/affiliate" },
  partner: { label: "Espace partenaire", icon: LayoutDashboard, to: "/partners" },
  admin: { label: "Administration", icon: Shield, to: "/admin" },
};

export function AffiliateHeaderMenu({ referralCode }: { referralCode?: string | null }) {
  const nav = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      nav("/affiliate/login", { replace: true });
    } finally { setBusy(false); }
  }

  async function copyPublicLink() {
    if (!referralCode) return;
    const url = new URL(CONTRACTOR_ENTRY_PATH, window.location.origin);
    url.searchParams.set("ref", referralCode);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Lien public copié");
    } catch {
      toast.error("Copie impossible. Réessayez.");
    }
  }

  if (!user) return null;

  const availableRoles = (roles ?? []).filter((r) => r !== "affiliate" && ROLE_LABELS[r]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserCircle2 className="h-4 w-4" />
          {user.email || user.phone || "Mon compte"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Espace affilié</DropdownMenuLabel>
        {referralCode && (
          <DropdownMenuItem onClick={copyPublicLink}>
            <Copy className="h-4 w-4 mr-2" /> Copier mon lien public
          </DropdownMenuItem>
        )}

        {availableRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Changer d'espace</DropdownMenuLabel>
            {availableRoles.map((r) => {
              const cfg = ROLE_LABELS[r];
              const Icon = cfg.icon;
              return (
                <DropdownMenuItem key={r} onClick={() => nav(cfg.to)}>
                  <Icon className="h-4 w-4 mr-2" /> {cfg.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => nav("/affiliate/login")}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Changer de compte
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} disabled={busy} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
