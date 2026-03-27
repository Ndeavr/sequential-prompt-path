/**
 * UnproPremiumCard — Premium offer card for the homepage carousel.
 * Inspired by TripleTen's bold card system.
 */
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/services/eventTrackingService";

export interface OfferCardData {
  id: string;
  eyebrow: string;
  title: string;
  badge: string;
  features: string[];
  description: string;
  cta: string;
  destination: string;
  icon: LucideIcon;
  gradient: string;       // tailwind gradient classes
  iconBg: string;         // icon circle bg
  accentColor: string;    // border-accent for hover
}

interface Props {
  card: OfferCardData;
  index: number;
  onAlexClick?: () => void;
}

export default function UnproPremiumCard({ card, index, onAlexClick }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    trackEvent({
      eventType: "rendezvous_click",
      category: "homepage_card",
      metadata: { card_id: card.id, card_title: card.title, index },
    });
    if (card.id === "alex" && onAlexClick) {
      onAlexClick();
    } else {
      navigate(card.destination);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      className="snap-center shrink-0 w-[85vw] max-w-[340px] md:w-[320px]"
    >
      <div
        className={`relative h-full rounded-3xl overflow-hidden border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group ${card.gradient}`}
      >
        {/* Top section */}
        <div className="p-5 pb-3 space-y-3">
          {/* Eyebrow */}
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-white/70">
            {card.eyebrow}
          </span>

          {/* Icon */}
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${card.iconBg}`}>
            <card.icon className="h-6 w-6 text-white" />
          </div>

          {/* Title */}
          <h3 className="font-display text-xl font-bold text-white leading-tight">
            {card.title}
          </h3>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/10">
            <span className="text-[11px] font-semibold text-white/90">{card.badge}</span>
          </div>
        </div>

        {/* Features */}
        <div className="px-5 pb-3 space-y-1.5">
          {card.features.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-white/50 shrink-0" />
              <span className="text-[13px] text-white/80 font-medium">{f}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="px-5 pb-4">
          <p className="text-[13px] text-white/60 leading-relaxed">{card.description}</p>
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={handleClick}
            className="w-full h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/15 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] group-hover:bg-white/25"
          >
            {card.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
