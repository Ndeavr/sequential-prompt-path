import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Loader2, TicketPercent } from "lucide-react";

type Plan = {
  plan_code: string;
  name: string;
  monthly_price: number;
  features: any;
  is_recommended?: boolean;
};

export default function PageAcqActivation() {
  const { slug } = useParams();
  const [contractor, setContractor] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [coupon, setCoupon] = useState("freetoday");
  const [couponValid, setCouponValid] = useState<null | { valid: boolean; final_amount?: number; message?: string }>(null);
  const [validating, setValidating] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("acq_contractors").select("*").eq("slug", slug).maybeSingle();
      setContractor(c);
      const { data: p } = await supabase.from("acq_pricing_plans").select("*").order("monthly_price");
      setPlans((p as any) || []);
      const recommended = (p as any)?.find((x: any) => x.plan_code === "pro") || (p as any)?.[0];
      if (recommended) setSelectedPlan(recommended.plan_code);
    })();
  }, [slug]);

  const validate = async () => {
    if (!coupon || !selectedPlan) return;
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("acq-validate-coupon", {
        body: { code: coupon, plan_code: selectedPlan, contractor_id: contractor?.id },
      });
      if (error) throw error;
      setCouponValid(data);
      if (data?.valid) toast.success(`Code valide — activation à ${data.final_amount}$`);
      else toast.error(data?.message || "Code invalide");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setValidating(false); }
  };

  const checkout = async () => {
    if (!selectedPlan || !contractor) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("acq-create-checkout", {
        body: {
          contractor_id: contractor.id,
          plan_code: selectedPlan,
          coupon_code: couponValid?.valid ? coupon : undefined,
          success_url: `${window.location.origin}/activation-success?cid=${contractor.id}`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message);
      setPaying(false);
    }
  };

  if (!contractor) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge>Activation UNPRO</Badge>
          <h1 className="text-3xl font-bold">{contractor.company_name}</h1>
          <p className="text-muted-foreground">Choisissez votre plan et activez votre profil maintenant</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Plan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {plans.map((p) => (
              <button
                key={p.plan_code}
                onClick={() => { setSelectedPlan(p.plan_code); setCouponValid(null); }}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedPlan === p.plan_code ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-muted-foreground">Code : {p.plan_code}</div>
                  </div>
                  <div className="text-2xl font-bold">{p.monthly_price}$<span className="text-sm font-normal">/mois</span></div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TicketPercent className="w-5 h-5" /> Code promo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={coupon} onChange={(e) => { setCoupon(e.target.value); setCouponValid(null); }} placeholder="freetoday" />
              <Button onClick={validate} disabled={validating || !coupon}>
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
              </Button>
            </div>
            {couponValid?.valid && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" /> Activation à <strong>{couponValid.final_amount}$</strong>
              </div>
            )}
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={checkout} disabled={paying || !selectedPlan}>
          {paying ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {couponValid?.valid ? `Payer ${couponValid.final_amount}$ et activer` : "Continuer vers le paiement"}
        </Button>
      </div>
    </div>
  );
}
