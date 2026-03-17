/**
 * UNPRO — Admin Pricing Dashboard Page
 * Dynamic Pricing · SLA · Revenue · AI Optimization
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, Shield, TrendingUp, Brain, Sliders } from "lucide-react";
import AdminPricingControls from "@/components/pricing/AdminPricingControls";
import DynamicPricingSettingsPanel from "@/components/pricing/DynamicPricingSettingsPanel";
import EmergencyPricingBasePanel from "@/components/pricing/EmergencyPricingBasePanel";
import SlaTiersPanel from "@/components/pricing/SlaTiersPanel";
import PricingLogsPanel from "@/components/pricing/PricingLogsPanel";
import AiOptimizationPanel from "@/components/pricing/AiOptimizationPanel";

type Tab = "engine" | "dynamic" | "sla" | "revenue" | "ai";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "engine", label: "Moteur", icon: Sliders },
  { key: "dynamic", label: "Dynamique", icon: DollarSign },
  { key: "sla", label: "SLA", icon: Shield },
  { key: "revenue", label: "Revenus", icon: TrendingUp },
  { key: "ai", label: "IA", icon: Brain },
];

export default function AdminPricingPage() {
  const [tab, setTab] = useState<Tab>("engine");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Tarification & Revenus</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Admin</span>
          </div>
          <p className="text-sm text-muted-foreground">Pricing dynamique, SLA, wallets, optimisation IA</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "engine" && <AdminPricingControls />}
          {tab === "dynamic" && (
            <div className="space-y-6">
              <DynamicPricingSettingsPanel />
              <EmergencyPricingBasePanel />
            </div>
          )}
          {tab === "sla" && <SlaTiersPanel />}
          {tab === "revenue" && <PricingLogsPanel />}
          {tab === "ai" && <AiOptimizationPanel />}
        </motion.div>
      </main>
    </div>
  );
}
