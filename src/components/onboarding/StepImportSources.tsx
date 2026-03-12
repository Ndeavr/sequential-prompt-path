import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Facebook, Instagram, Phone, Building2, ArrowRight, Shield, Sparkles, Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onImport: (data: { businessName: string; website: string; googleUrl: string; facebookUrl: string; instagramUrl: string; phone: string; city: string }) => void;
  onManual: () => void;
}

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function StepImportSources({ onImport, onManual }: Props) {
  const [form, setForm] = useState({ businessName: "", website: "", googleUrl: "", facebookUrl: "", instagramUrl: "", phone: "", city: "" });
  const [focused, setFocused] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const canImport = form.businessName.trim().length > 1;

  const sources = [
    { icon: MapPin, label: "Google", color: "text-red-400", bg: "bg-red-400/10", active: !!form.googleUrl },
    { icon: Facebook, label: "Facebook", color: "text-blue-400", bg: "bg-blue-400/10", active: !!form.facebookUrl },
    { icon: Globe, label: "Website", color: "text-accent", bg: "bg-accent/10", active: !!form.website },
    { icon: Instagram, label: "Instagram", color: "text-pink-400", bg: "bg-pink-400/10", active: !!form.instagramUrl },
  ];

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Import
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-foreground leading-[1.15]">
            Import your<br />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              business presence
            </span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            We'll retrieve what already exists online, build your profile, calculate your AIPP score, and show your best growth path.
          </p>
        </motion.div>

        {/* Source icons — animated connection indicators */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="flex justify-center gap-3">
          {sources.map((s, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
                s.active
                  ? `${s.bg} border-current ${s.color} shadow-[var(--shadow-glow)]`
                  : "bg-card/60 border-border/50 hover:border-border hover:bg-card/80"
              }`}>
                <s.icon className={`w-5 h-5 ${s.active ? s.color : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-medium ${s.active ? "text-foreground" : "text-muted-foreground/60"}`}>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-5 space-y-3 shadow-[var(--shadow-lg)]">
            <FieldRow icon={Building2} placeholder="Business name *" value={form.businessName} onChange={v => set("businessName", v)} focused={focused === "name"} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} highlight />
            <div className="h-px bg-border/30 my-1" />
            <FieldRow icon={Globe} placeholder="Website URL" value={form.website} onChange={v => set("website", v)} focused={focused === "web"} onFocus={() => setFocused("web")} onBlur={() => setFocused(null)} />
            <FieldRow icon={MapPin} placeholder="Google Business Profile URL" value={form.googleUrl} onChange={v => set("googleUrl", v)} focused={focused === "google"} onFocus={() => setFocused("google")} onBlur={() => setFocused(null)} />
            <FieldRow icon={Facebook} placeholder="Facebook Page URL" value={form.facebookUrl} onChange={v => set("facebookUrl", v)} focused={focused === "fb"} onFocus={() => setFocused("fb")} onBlur={() => setFocused(null)} />
            <FieldRow icon={Instagram} placeholder="Instagram URL (optional)" value={form.instagramUrl} onChange={v => set("instagramUrl", v)} focused={focused === "ig"} onFocus={() => setFocused("ig")} onBlur={() => setFocused(null)} />
            <div className="h-px bg-border/30 my-1" />
            <FieldRow icon={Phone} placeholder="Phone number (optional)" value={form.phone} onChange={v => set("phone", v)} focused={focused === "phone"} onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)} />
            <FieldRow icon={Search} placeholder="City / main service area" value={form.city} onChange={v => set("city", v)} focused={focused === "city"} onFocus={() => setFocused("city")} onBlur={() => setFocused(null)} />
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="space-y-3">
          <Button
            onClick={() => onImport(form)}
            disabled={!canImport}
            className="w-full h-13 text-base font-semibold bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-[var(--shadow-glow-lg)] hover:brightness-110 transition-all duration-300 border-0 rounded-xl gap-2 group"
          >
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Import & Analyze
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="ghost" onClick={onManual} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
            I'll fill it manually →
          </Button>
        </motion.div>

        {/* Trust signals */}
        <motion.div {...fadeUp} transition={{ delay: 0.6 }} className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <Shield className="w-3.5 h-3.5 text-success/70" />
            <span>We only retrieve public business information needed to build your profile.</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
            <span>🔒 Encrypted</span>
            <span>⚡ 30-second scan</span>
            <span>✓ No access required</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, placeholder, value, onChange, focused, onFocus, onBlur, highlight }: {
  icon: any; placeholder: string; value: string; onChange: (v: string) => void;
  focused?: boolean; onFocus?: () => void; onBlur?: () => void; highlight?: boolean;
}) {
  return (
    <div className={`relative transition-all duration-200 rounded-xl ${focused ? "ring-1 ring-primary/30" : ""}`}>
      <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused ? "text-primary" : "text-muted-foreground/50"}`} />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`pl-10 h-11 border-0 bg-muted/20 rounded-xl text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:bg-muted/30 transition-colors ${highlight && !value ? "bg-muted/30" : ""}`}
      />
      {value && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-success"
        />
      )}
    </div>
  );
}
