import { Phone, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useContractorHumanCallout } from "@/hooks/useContractorHumanCallout";
import { CONTRACTOR_HUMAN_CALLOUT } from "@/config/contractorHumanCallout";

export default function ContractorHumanCalloutModal() {
  const { isOpen, dismiss, call } = useContractorHumanCallout();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent
        className="alex-immersive max-w-md border-white/10 bg-[#0B1220]/95 backdrop-blur-2xl rounded-[28px] p-0 overflow-hidden [&>button]:hidden text-white"
        style={{ transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pt-10 pb-8 text-center">
          <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Phone className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
            {CONTRACTOR_HUMAN_CALLOUT.title}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {CONTRACTOR_HUMAN_CALLOUT.subtitle}
          </p>

          <Button
            onClick={call}
            className="mt-6 w-full h-14 rounded-[18px] text-base font-semibold gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-95"
          >
            <Phone className="h-4 w-4" />
            {CONTRACTOR_HUMAN_CALLOUT.primaryCta} {CONTRACTOR_HUMAN_CALLOUT.phoneDisplay}
          </Button>

          <button
            type="button"
            onClick={dismiss}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {CONTRACTOR_HUMAN_CALLOUT.secondaryCta}
          </button>

          <p className="mt-5 text-[11px] uppercase tracking-wide text-muted-foreground/70">
            {CONTRACTOR_HUMAN_CALLOUT.hours}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
