import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { rememberClaraReferences } from "@/services/clara/claraSession";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

interface ClaraFormAssistantProps {
  form: "contractor_audit" | "affiliate_onboarding" | "account_onboarding";
  step: string | number;
}

export default function ClaraFormAssistant({ form, step }: ClaraFormAssistantProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    rememberClaraReferences({ workflow: { visible_form: form, visible_step: String(step) } } as never);
    trackCopilotEvent("clara_form_context_visible", { surface: form, kind: String(step) });
  }, [form, step]);

  const setAssistanceOpen = (next: boolean) => {
    setOpen(next);
    trackCopilotEvent(next ? "clara_form_assistance_opened" : "clara_form_assistance_closed", {
      surface: form,
      kind: String(step),
    });
  };

  return (
    <>
      <aside className="clara-form-assistant-desktop home-light" aria-label="Assistance Clara">
        <div className="clara-form-assistant-heading">
          <strong>Clara</strong><span>Étape {step}</span>
        </div>
        <ClaraConversationBox />
      </aside>

      <Button type="button" onClick={() => setAssistanceOpen(true)} className="clara-form-assistant-trigger lg:hidden" aria-label="Demander à Clara">
        <MessageCircle aria-hidden="true" /> Demander à Clara
      </Button>

      <Sheet open={open} onOpenChange={setAssistanceOpen}>
        <SheetContent side="bottom" className="clara-form-assistant-sheet home-light p-0">
          <SheetHeader className="clara-form-assistant-sheet-header">
            <SheetTitle>Clara · Étape {step}</SheetTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAssistanceOpen(false)}>
              <X aria-hidden="true" /> Retour au formulaire
            </Button>
          </SheetHeader>
          <ClaraConversationBox />
        </SheetContent>
      </Sheet>
    </>
  );
}