/**
 * UNPRO — Scanner Hub Multi-Rôle
 * Central entry point for business card scanning with role-aware mode selection.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanLine, Shield, Handshake, Users, Briefcase,
  ArrowLeft, Lock, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ScannerMode {
  code: string;
  name: string;
  description: string;
  role_code: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  attribution: string;
}

const MODE_META: Record<string, Omit<ScannerMode, "code" | "name" | "description" | "role_code">> = {
  admin_assist: {
    icon: <Shield className="w-6 h-6" />,
    color: "text-red-500 bg-red-500/10",
    route: "/business-card-import?mode=admin_assist",
    attribution: "Attribution manuelle",
  },
  field_rep_activation: {
    icon: <Handshake className="w-6 h-6" />,
    color: "text-blue-500 bg-blue-500/10",
    route: "/business-card-import?mode=field_rep_activation",
    attribution: "Attribué à vous",
  },
  affiliate_referral_capture: {
    icon: <Users className="w-6 h-6" />,
    color: "text-emerald-500 bg-emerald-500/10",
    route: "/business-card-import?mode=affiliate_referral_capture",
    attribution: "Attribué à vous (affilié)",
  },
  contractor_self_or_team_capture: {
    icon: <Briefcase className="w-6 h-6" />,
    color: "text-amber-500 bg-amber-500/10",
    route: "/business-card-import?mode=contractor_self_or_team_capture",
    attribution: "Mon entreprise",
  },
};

export default function PageBusinessCardScannerHub() {
  const navigate = useNavigate();
  const { user, isAuthenticated, role } = useAuth();
  const { activeRole } = useActiveRole();

  // Fetch available modes from DB
  const { data: modes } = useQuery({
    queryKey: ["scanner-modes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scanner_session_modes")
        .select("*")
        .eq("active", true);
      return data || [];
    },
  });

  // Fetch user permissions
  const { data: permissions } = useQuery({
    queryKey: ["scanner-permissions", role],
    queryFn: async () => {
      if (!role) return [];
      // For admin, get all; otherwise get for current role
      const query = role === "admin"
        ? supabase.from("role_permissions").select("*").eq("is_allowed", true)
        : supabase.from("role_permissions").select("*").eq("role_code", role).eq("is_allowed", true);
      const { data } = await query;
      return data || [];
    },
    enabled: !!role,
  });

  const canScan = useMemo(() => {
    if (!permissions) return false;
    return permissions.some((p) => p.permission_code === "scan_business_cards");
  }, [permissions]);

  const availableModes = useMemo(() => {
    if (!modes || !permissions) return [];
    const allowedRoles = new Set<string>();

    // Admin gets all modes
    if (role === "admin") {
      return modes.map((m) => ({
        ...m,
        ...(MODE_META[m.code] || {}),
      }));
    }

    // Others get modes matching their role
    permissions.forEach((p) => {
      if (p.permission_code.startsWith("access_") && p.permission_code.endsWith("_scanner_mode")) {
        // Extract role from permission: access_X_scanner_mode
        const modeCode = p.permission_code.replace("access_", "").replace("_scanner_mode", "");
        // Map permission to role_code
        const mapping: Record<string, string> = {
          admin: "admin",
          field_rep: "representative",
          affiliate: "affiliate",
          contractor: "contractor",
        };
        if (mapping[modeCode]) allowedRoles.add(mapping[modeCode]);
      }
    });

    return modes
      .filter((m) => allowedRoles.has(m.role_code))
      .map((m) => ({ ...m, ...(MODE_META[m.code] || {}) }));
  }, [modes, permissions, role]);

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-sm w-full text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Connexion requise</h2>
              <p className="text-sm text-muted-foreground">
                Connectez-vous pour accéder au scanner multi-rôle.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/login")}>Se connecter</Button>
                <Button variant="outline" onClick={() => navigate("/business-card-import")}>
                  Scanner en mode invité
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If single mode, go directly
  const handleModeSelect = (mode: any) => {
    const meta = MODE_META[mode.code];
    if (meta) navigate(meta.route);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onBack={() => navigate(-1)} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <ScanLine className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Scanner une carte</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez votre mode de scan selon votre rôle.
          </p>
        </motion.div>

        {/* Role badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Shield className="w-3 h-3" />
            {role === "admin" ? "Administrateur" : role === "contractor" ? "Entrepreneur" : role || "Utilisateur"}
          </span>
        </div>

        {/* Available modes */}
        {!canScan ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">Accès non autorisé</p>
              <p className="text-xs text-muted-foreground">
                Votre rôle actuel ({role || activeRole || "aucun"}) ne permet pas d'utiliser le scanner.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button size="sm" onClick={() => navigate("/login")} className="gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Se connecter avec un autre compte
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setActiveRole("contractor" as any); }}
                  className="gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Mode Entrepreneur
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setActiveRole("partner" as any); }}
                  className="gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" /> Mode Affilié
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setActiveRole("admin" as any); }}
                  className="gap-1.5"
                >
                  <Handshake className="w-3.5 h-3.5" /> Mode Représentant
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {availableModes.map((mode, i) => {
              const meta = MODE_META[mode.code];
              if (!meta) return null;
              return (
                <motion.div
                  key={mode.code}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all active:scale-[0.98]"
                    onClick={() => handleModeSelect(mode)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{mode.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{mode.description}</p>
                        <p className="text-[10px] text-primary mt-1">{meta.attribution}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1.5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-foreground">Scanner multi-rôle</h1>
          <p className="text-[10px] text-muted-foreground">Carte d'affaires → Lead qualifié</p>
        </div>
        <ScanLine className="w-5 h-5 text-primary" />
      </div>
    </div>
  );
}
