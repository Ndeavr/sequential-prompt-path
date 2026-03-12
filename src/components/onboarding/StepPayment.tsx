import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, CreditCard, ChevronRight, Shield, Check, Sparkles, ArrowRight, Award, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";

interface Props {
  planName: string;
  price: number;
  interval: "month" | "year";
  aippScore: number;
  objective: string;
  onPay: () => void;
}

const addOns = [
  { id: "city-pages", label: "Extra city pages", desc: "Expand to more cities", price: 29 },
  { id: "review-campaign", label: "Review campaign", desc: "Automated review collection", price: 49 },
  { id: "photo-enhance", label: "Photo enhancement", desc: "AI-optimized portfolio", price: 39 },
  { id: "logo-redesign", label: "Logo redesign", desc: "Professional brand refresh", price: 149 },
  { id: "faq-pack", label: "Authority FAQ pack", desc: "SEO-rich FAQ content", price: 59 },
];

export default function StepPayment({ planName, price, interval, aippScore, objective, onPay }: Props) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const toggleAddOn = (id: string) => setSelectedAddOns(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  const addOnTotal = addOns.filter(a => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const total = price + addOnTotal;
  const targetAipp = Math.min(100, aippScore + 25);

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold uppercase tracking-wide">
            <Lock className="w-3 h-3" /> Secure Checkout
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Complete Your Order
          </h2>
        </motion.div>

        {/* Order summary — premium card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/60 to-primary/[0.03] backdrop-blur-xl p-5 space-y-4 shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-foreground">{planName} Plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">{interval === "year" ? "Annual billing" : "Monthly billing"}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">${price}</p>
              <p className="text-[10px] text-muted-foreground">/{interval === "month" ? "mo" : "yr"}</p>
            </div>
          </div>
          <div className="h-px bg-border/20" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/20">
              <Award className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">AIPP Score</p>
                <p className="text-xs font-bold text-foreground">{aippScore} → <span className="text-success">{targetAipp}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/10 border border-border/20">
              <Clock className="w-4 h-4 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground">Activation</p>
                <p className="text-xs font-bold text-foreground">Immediate</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add-ons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-2.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" /> Optional Add-ons
          </p>
          {addOns.map(addon => (
            <button key={addon.id} onClick={() => toggleAddOn(addon.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                selectedAddOns.includes(addon.id)
                  ? "bg-primary/[0.06] border border-primary/30"
                  : "bg-muted/[0.05] border border-transparent hover:bg-muted/10 hover:border-border/20"
              }`}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selectedAddOns.includes(addon.id)
                  ? "bg-primary border-primary"
                  : "border-border/40 group-hover:border-border/60"
              }`}>
                {selectedAddOns.includes(addon.id) && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{addon.label}</span>
                <p className="text-[10px] text-muted-foreground/60">{addon.desc}</p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">+${addon.price}</span>
            </button>
          ))}
        </motion.div>

        {/* Payment fields */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Details</p>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Business name" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
            <Input placeholder="Contact name" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
            <Input placeholder="Phone" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
          </div>
          <Input placeholder="Postal code" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
          <div className="h-px bg-border/20 my-1" />
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input placeholder="Card number" className="pl-10 h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="MM / YY" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
            <Input placeholder="CVC" className="h-11 bg-muted/10 border-border/20 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
          </div>
        </motion.div>

        {/* Total + CTA */}
        <div className="rounded-xl border border-border/30 bg-card/30 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total today</p>
            <p className="text-2xl font-bold text-foreground">${total}<span className="text-sm text-muted-foreground font-normal">/{interval === "month" ? "mo" : "yr"}</span></p>
          </div>
          {selectedAddOns.length > 0 && (
            <p className="text-[10px] text-muted-foreground">+{selectedAddOns.length} add-on{selectedAddOns.length > 1 ? "s" : ""}</p>
          )}
        </div>

        <Button onClick={onPay}
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-[var(--shadow-glow-lg)] hover:brightness-110 transition-all duration-300 border-0 rounded-xl gap-2 group">
          <Lock className="w-4 h-4" />
          Pay & Activate Now
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-muted-foreground/50 pb-4">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-success/50" /> 256-bit encryption</span>
          <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Cancel anytime</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Instant activation</span>
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 30-day guarantee</span>
        </div>
      </div>
    </div>
  );
}
