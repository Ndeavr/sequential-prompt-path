/**
 * PanelLiveActivityFeed — Real-time social proof feed.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityEvent {
  id: string;
  event_type: string;
  city: string | null;
  message: string;
  created_at: string;
}

const MOCK_EVENTS: ActivityEvent[] = [
  { id: "1", event_type: "booking", city: "Laval", message: "Un propriétaire a réservé un rendez-vous pour l'isolation", created_at: new Date().toISOString() },
  { id: "2", event_type: "booking", city: "Montréal", message: "3 propriétaires ont réservé aujourd'hui", created_at: new Date().toISOString() },
  { id: "3", event_type: "match", city: "Longueuil", message: "Un match parfait trouvé en 12 secondes", created_at: new Date().toISOString() },
  { id: "4", event_type: "verification", city: "Terrebonne", message: "Nouvel entrepreneur vérifié RBQ + NEQ", created_at: new Date().toISOString() },
];

export default function PanelLiveActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>(MOCK_EVENTS);
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Rotate visible event
  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleIndex(prev => (prev + 1) % events.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [events.length]);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel("live-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_activity_events" }, (payload) => {
        const newEvent = payload.new as ActivityEvent;
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const current = events[visibleIndex];
  if (!current) return null;

  const iconMap: Record<string, React.ElementType> = {
    booking: Calendar,
    match: Activity,
    verification: MapPin,
  };
  const Icon = iconMap[current.event_type] ?? Activity;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">En direct</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + visibleIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-foreground leading-relaxed">{current.message}</p>
            {current.city && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> {current.city}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
