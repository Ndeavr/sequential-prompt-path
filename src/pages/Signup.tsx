import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("homeowner");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, fullName, role);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre courriel pour confirmer.");
      navigate("/login");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(210 60% 92% / 0.6)" }} />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.1)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #DFE9F5", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold" style={{ color: "#3F7BFF" }}>UNPRO</CardTitle>
            <CardDescription style={{ color: "#6C7A92" }}>Créer votre compte</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" style={{ color: "#0B1533" }}>Nom complet</Label>
                <Input
                  id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  placeholder="Jean Dupont"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: "#0B1533" }}>Courriel</Label>
                <Input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="vous@exemple.com"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: "#0B1533" }}>Mot de passe</Label>
                <Input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder="••••••••"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: "#0B1533" }}>Type de compte</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "white", border: "1px solid #DFE9F5" }}>
                    <SelectItem value="homeowner">Propriétaire</SelectItem>
                    <SelectItem value="contractor">Entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit" className="w-full" disabled={loading}
                style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
              >
                {loading ? "Création…" : "Créer mon compte"}
              </Button>
              <p className="text-sm" style={{ color: "#6C7A92" }}>
                Déjà un compte ?{" "}
                <Link to="/login" className="font-medium hover:underline" style={{ color: "#3F7BFF" }}>Se connecter</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
