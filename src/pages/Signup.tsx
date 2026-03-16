import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Home, Building2, Briefcase, Wrench, Handshake, Gift, Building } from "lucide-react";
import logo from "@/assets/unpro-robot.png";

const ACCOUNT_TYPES = [
  {
    value: "homeowner",
    label: "Propriétaire",
    description: "Gérer mes projets et protéger ma propriété",
    icon: Home,
    roleForDb: "homeowner",
  },
  {
    value: "property_manager",
    label: "Gestionnaire immobilier",
    description: "Administrer des copropriétés ou immeubles",
    icon: Building,
    roleForDb: "homeowner",
  },
  {
    value: "professional",
    label: "Professionnel",
    description: "Offrir des services spécialisés aux propriétaires",
    icon: Briefcase,
    roleForDb: "contractor",
  },
  {
    value: "contractor",
    label: "Entrepreneur",
    description: "Recevoir des rendez-vous exclusifs et bâtir ma réputation",
    icon: Wrench,
    roleForDb: "contractor",
  },
  {
    value: "partner",
    label: "Partenaire",
    description: "Municipalités, médias, organismes et collaborateurs",
    icon: Handshake,
    roleForDb: "homeowner",
  },
  {
    value: "ambassador",
    label: "Ambassadeur",
    description: "Référez, gagnez des récompenses et des revenus récurrents",
    icon: Gift,
    roleForDb: "homeowner",
  },
] as const;

const Signup = () => {
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<string>("homeowner");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salutation) {
      toast.error("Veuillez sélectionner une civilité.");
      return;
    }
    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const selectedType = ACCOUNT_TYPES.find((t) => t.value === accountType);
    const roleForDb = selectedType?.roleForDb ?? "homeowner";

    const { error } = await signUp(email, password, fullName, roleForDb, {
      salutation,
      first_name: firstName,
      last_name: lastName,
      account_type: accountType,
    });
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
      className="flex min-h-screen items-center justify-center px-4 py-8 relative overflow-hidden"
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
        className="relative z-10 w-full max-w-lg"
      >
        <Card
          className="border-0"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #DFE9F5",
            boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)",
          }}
        >
          {/* Brand Header */}
          <CardHeader className="text-center pt-8 pb-2 space-y-1">
            <div className="flex justify-center mb-2">
              <img src={logo} alt="UNPRO" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0B1533" }}>
              Créez votre compte
            </h1>
            <p className="text-sm" style={{ color: "#6C7A92" }}>
              Rejoignez UNPRO en quelques secondes
            </p>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-2">
              {/* Row: Civilité + Prénom + Nom */}
              <div className="grid grid-cols-[100px_1fr] gap-3 sm:grid-cols-[100px_1fr_1fr]">
                {/* Civilité */}
                <div className="space-y-1.5">
                  <Label style={{ color: "#0B1533" }}>Civilité</Label>
                  <Select value={salutation} onValueChange={setSalutation}>
                    <SelectTrigger
                      className="h-10"
                      style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                    >
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "white", border: "1px solid #DFE9F5" }}>
                      <SelectItem value="M.">M.</SelectItem>
                      <SelectItem value="Mme">Mme</SelectItem>
                      <SelectItem value="Mx">Mx</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Prénom */}
                <div className="space-y-1.5">
                  <Label style={{ color: "#0B1533" }}>Prénom</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Jean"
                    style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                  />
                </div>

                {/* Nom — full width on mobile, inline on sm+ */}
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label style={{ color: "#0B1533" }}>Nom</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Dupont"
                    style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                  />
                </div>
              </div>

              {/* Courriel */}
              <div className="space-y-1.5">
                <Label style={{ color: "#0B1533" }}>Courriel</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="vous@exemple.com"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <Label style={{ color: "#0B1533" }}>Mot de passe</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                />
              </div>

              {/* Account Type Radio Cards */}
              <div className="space-y-2">
                <Label style={{ color: "#0B1533" }}>Type de compte</Label>
                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {ACCOUNT_TYPES.map((type) => {
                    const isSelected = accountType === type.value;
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountType(type.value)}
                        className="relative flex flex-col items-start gap-1 rounded-xl p-3.5 text-left transition-all duration-200 cursor-pointer"
                        style={{
                          background: isSelected ? "hsl(218 100% 97%)" : "white",
                          border: isSelected ? "2px solid #3F7BFF" : "1.5px solid #DFE9F5",
                          boxShadow: isSelected
                            ? "0 0 0 3px hsl(218 100% 61% / 0.12), 0 2px 8px -2px hsl(220 40% 30% / 0.08)"
                            : "0 1px 4px -1px hsl(220 40% 30% / 0.06)",
                        }}
                      >
                        {isSelected && (
                          <div
                            className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full"
                            style={{ background: "#3F7BFF" }}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Icon
                            className="h-4 w-4 shrink-0"
                            style={{ color: isSelected ? "#3F7BFF" : "#6C7A92" }}
                          />
                          <span
                            className="text-sm font-semibold"
                            style={{ color: isSelected ? "#2563EB" : "#0B1533" }}
                          >
                            {type.label}
                          </span>
                        </div>
                        <span className="text-xs leading-snug" style={{ color: "#6C7A92" }}>
                          {type.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button
                type="submit"
                className="w-full h-11 text-sm font-bold rounded-xl"
                disabled={loading}
                style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
              >
                {loading ? "Création…" : "Créer mon compte"}
              </Button>
              <p className="text-sm text-center" style={{ color: "#6C7A92" }}>
                Déjà un compte ?{" "}
                <Link to="/login" className="font-medium hover:underline" style={{ color: "#3F7BFF" }}>
                  Se connecter
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
