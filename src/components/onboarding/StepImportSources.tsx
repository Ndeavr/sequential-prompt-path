import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Facebook, Instagram, Phone, Building2, ArrowRight, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onImport: (data: { businessName: string; website: string; googleUrl: string; facebookUrl: string; instagramUrl: string; phone: string; city: string }) => void;
  onManual: () => void;
}

export default function StepImportSources({ onImport, onManual }: Props) {
  const [form, setForm] = useState({ businessName: "", website: "", googleUrl: "", facebookUrl: "", instagramUrl: "", phone: "", city: "" });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const canImport = form.businessName.trim().length > 1;

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AI-Powered Import
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight text-foreground">
            Import your business presence
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            We'll retrieve what already exists online, build your profile, calculate your AIPP, and show your best growth path.
          </p>
        </motion.div>

        {/* Source icons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center gap-4">
          {[
            { icon: MapPin, label: "Google", color: "text-red-400" },
            { icon: Facebook, label: "Facebook", color: "text-blue-400" },
            { icon: Globe, label: "Website", color: "text-accent" },
            { icon: Building2, label: "Reviews", color: "text-yellow-400" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-lg p-5 space-y-4">
            <FieldRow icon={Building2} placeholder="Business name *" value={form.businessName} onChange={v => set("businessName", v)} />
            <FieldRow icon={Globe} placeholder="Website URL" value={form.website} onChange={v => set("website", v)} />
            <FieldRow icon={MapPin} placeholder="Google Maps / Business Profile URL" value={form.googleUrl} onChange={v => set("googleUrl", v)} />
            <FieldRow icon={Facebook} placeholder="Facebook Page URL" value={form.facebookUrl} onChange={v => set("facebookUrl", v)} />
            <FieldRow icon={Instagram} placeholder="Instagram URL (optional)" value={form.instagramUrl} onChange={v => set("instagramUrl", v)} />
            <FieldRow icon={Phone} placeholder="Phone number (optional)" value={form.phone} onChange={v => set("phone", v)} />
            <FieldRow icon={MapPin} placeholder="City / main service area (optional)" value={form.city} onChange={v => set("city", v)} />
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-3">
          <Button onClick={() => onImport(form)} disabled={!canImport} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
            Import my business <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={onManual} className="w-full text-sm text-muted-foreground hover:text-foreground">
            I'll fill it manually
          </Button>
        </motion.div>

        {/* Trust note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>We only retrieve business information needed to build your profile.</span>
        </motion.div>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, placeholder, value, onChange }: { icon: any; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-11 bg-muted/30 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:ring-primary/30"
      />
    </div>
  );
}
