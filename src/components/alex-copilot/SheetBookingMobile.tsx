/**
 * SheetBookingMobile — minimal mobile booking sheet.
 * Stores nothing yet — fires booking_completed analytics + success state.
 * Production wiring to api_unified_booking can be added without changing UI.
 */
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import type { RecommendedPro } from "@/stores/copilotConversationStore";

interface Props {
  open: boolean;
  pro: RecommendedPro | null;
  onClose: () => void;
}

const TIME_SLOTS = ["8h - 10h", "10h - 12h", "13h - 15h", "15h - 17h", "17h - 19h"];

function nextDays(n: number) {
  const out: { iso: string; label: string; dom: number }[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = d.toLocaleDateString("fr-CA", { weekday: "short" });
    out.push({ iso: d.toISOString().slice(0, 10), label, dom: d.getDate() });
  }
  return out;
}

export default function SheetBookingMobile({ open, pro, onClose }: Props) {
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const days = nextDays(10);

  const canSubmit = !!date && !!slot && name.trim().length > 1 && phone.trim().length >= 7;

  function handleSubmit() {
    if (!canSubmit) return;
    trackCopilotEvent("booking_completed", {
      proId: pro?.id,
      date,
      slot,
    });
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
      setDate(null);
      setSlot(null);
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
    }, 2400);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[hsl(220_45%_7%)] border-t border-white/10 text-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            Prendre rendez-vous
          </SheetTitle>
          {pro && (
            <p className="text-[13px] text-white/70">
              Avec <span className="text-white font-medium">{pro.name}</span>
            </p>
          )}
        </SheetHeader>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold">Rendez-vous demandé ✅</h3>
              <p className="text-[13px] text-white/70">Le pro confirmera sous peu.</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5 mt-4 pb-6"
            >
              {/* Date */}
              <div>
                <label className="text-[12px] uppercase tracking-wide text-white/60 font-semibold">
                  Choisir une date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 mt-2 -mx-1 px-1 scrollbar-hide">
                  {days.map((d) => {
                    const active = date === d.iso;
                    return (
                      <button
                        key={d.iso}
                        onClick={() => setDate(d.iso)}
                        className={`flex flex-col items-center justify-center min-w-[58px] h-16 rounded-xl border transition ${
                          active
                            ? "bg-sky-500 border-sky-400 text-white shadow-[0_4px_18px_-4px_hsl(207_100%_60%/0.6)]"
                            : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-[11px] capitalize">{d.label}</span>
                        <span className="text-lg font-bold leading-none">{d.dom}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="text-[12px] uppercase tracking-wide text-white/60 font-semibold">
                  Choisir une plage
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TIME_SLOTS.map((s) => {
                    const active = slot === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setSlot(s)}
                        className={`h-11 rounded-xl border text-[13px] font-medium transition ${
                          active
                            ? "bg-sky-500 border-sky-400 text-white"
                            : "bg-white/5 border-white/10 text-white/85 hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Identity */}
              <div className="space-y-3">
                <Input
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-xl"
                />
                <Input
                  placeholder="Téléphone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-xl"
                />
                <Input
                  placeholder="Adresse du projet"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-xl"
                />
                <Textarea
                  placeholder="Notes (optionnel)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 rounded-xl text-[15px] font-semibold bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] text-white disabled:opacity-50"
              >
                Confirmer mon rendez-vous
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
