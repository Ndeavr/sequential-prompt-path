import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, CreditCard, ChevronRight, Shield, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  planName: string;
  price: number;
  interval: "month" | "year";
  aippScore: number;
  objective: string;
  onPay: () => void;
}

const addOns = [
  { id: "city-pages", label: "Extra city pages", price: 29 },
  { id: "review-campaign", label: "Review campaign", price: 49 },
  { id: "photo-enhance", label: "Photo enhancement", price: 39 },
  { id: "logo-redesign", label: "Logo redesign", price: 149 },
  { id: "faq-pack", label: "Authority FAQ pack", price: 59 },
];

export default function StepPayment({ planName, price, interval, aippScore, objective, onPay }: Props) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const toggleAddOn = (id: string) => setSelectedAddOns(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  const addOnTotal = addOns.filter(a => selectedAddOns.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const total = price + addOnTotal;

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Secure Checkout</h2>
          <p className="text-sm text-muted-foreground">Activation starts immediately after payment.</p>
        </motion.div>

        {/* Summary card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">{planName} Plan</p>
              <p className="text-xs text-muted-foreground">AIPP: {aippScore}/100 → Target: {Math.min(100, aippScore + 25)}/100</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">${price}<span className="text-xs text-muted-foreground">/{interval === "month" ? "mo" : "yr"}</span></p>
            </div>
          </div>
        </motion.div>

        {/* Add-ons */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add-ons</p>
          {addOns.map(addon => (
            <button key={addon.id} onClick={() => toggleAddOn(addon.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all text-left ${
                selectedAddOns.includes(addon.id) ? "bg-primary/10 border border-primary/30" : "bg-muted/20 border border-transparent hover:bg-muted/40"
              }`}>
              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                selectedAddOns.includes(addon.id) ? "bg-primary border-primary" : "border-border"
              }`}>
                {selectedAddOns.includes(addon.id) && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="text-sm text-foreground flex-1">{addon.label}</span>
              <span className="text-sm text-muted-foreground">+${addon.price}</span>
            </button>
          ))}
        </motion.div>

        {/* Payment fields */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Info</p>
          <Input placeholder="Business name" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          <Input placeholder="Contact name" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
            <Input placeholder="Phone" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          </div>
          <Input placeholder="Postal code" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Card number" className="pl-10 h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="MM/YY" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
            <Input placeholder="CVC" className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm" />
          </div>
        </motion.div>

        {/* Total */}
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold text-foreground">${total}<span className="text-xs text-muted-foreground">/{interval === "month" ? "mo" : "yr"}</span></span>
        </div>

        <Button onClick={onPay} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
          <Lock className="w-4 h-4" /> Pay & Activate Now
        </Button>

        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Secure payment</span>
          <span>•</span>
          <span>Cancel anytime</span>
          <span>•</span>
          <span>Instant activation</span>
        </div>
      </div>
    </div>
  );
}
