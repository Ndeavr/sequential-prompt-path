/**
 * UNPRO — Partner Login + Signup
 * Auto-signup creates auth user + partners row (status=pending).
 * Approved partners are routed to /partenaire/dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { saveReturnPath } from "@/lib/authReturn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export default function PartnerLogin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/partenaire/dashboard";
  const { isAuthenticated, role } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  // Persist return target for the global auth-return system.
  useEffect(() => {
    saveReturnPath(returnTo, "protected_route");
  }, [returnTo]);

  // Already logged in → route by role
  useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "partner" || role === "admin") nav(returnTo, { replace: true });
  }, [isAuthenticated, role, returnTo, nav]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Connexion réussie");
    nav(returnTo, { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/partenaire/dashboard`,
        data: { full_name: `${firstName} ${lastName}`.trim() },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }

    const userId = data.user?.id;
    if (userId) {
      const { error: pErr } = await supabase.from("partners").insert({
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        company,
        partner_status: "pending",
      } as any);
      if (pErr) console.error("[partner signup]", pErr);
    }
    setLoading(false);
    toast.success("Demande envoyée. Un administrateur va vous approuver.");
    setTab("login");
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/partenaires-certifies" className="text-xs text-amber-400/70 hover:text-amber-400 mb-6 inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Programme Partenaire Certifié
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold mb-1">Espace Partenaire</h1>
          <p className="text-sm text-white/60 mb-6">Connectez-vous ou demandez votre accès.</p>

          <div className="flex gap-1 p-1 rounded-lg bg-white/5 mb-5">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm rounded-md transition ${tab === t ? "bg-amber-500 text-black font-medium" : "text-white/70"}`}
              >
                {t === "login" ? "Connexion" : "Devenir partenaire"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label>Courriel</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Mot de passe</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button disabled={loading} className="w-full bg-amber-500 text-black hover:bg-amber-400">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Prénom</Label><Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div><Label>Nom</Label><Input required value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div><Label>Courriel</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>Téléphone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Entreprise</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
              <div><Label>Mot de passe</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button disabled={loading} className="w-full bg-amber-500 text-black hover:bg-amber-400">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Demander mon accès"}
              </Button>
              <p className="text-[11px] text-white/50 text-center">Approbation manuelle par un administrateur.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
