import { useEffect, useRef, useState } from "react";
import { MessageCircle, Minus } from "lucide-react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { Button } from "@/components/ui/button";
import { rememberClaraReferences } from "@/services/clara/claraSession";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

interface ClaraFormAssistantProps {
  form: "contractor_audit" | "affiliate_onboarding" | "account_onboarding";
  step: string | number;
}

export default function ClaraFormAssistant({ form, step }: ClaraFormAssistantProps) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const minimizeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasOpened) (open ? minimizeRef : triggerRef).current?.focus({ preventScroll: true });
  }, [open, hasOpened]);

  useEffect(() => {
    rememberClaraReferences({ workflow: { visible_form: form, visible_step: String(step) } } as never);
    trackCopilotEvent("clara_form_context_visible", { surface: form, kind: String(step) });
  }, [form, step]);

  const setAssistanceOpen = (next: boolean) => {
    if (next) setHasOpened(true);
    setOpen(next);
    trackCopilotEvent(next ? "clara_form_assistance_opened" : "clara_form_assistance_closed", {
      surface: form,
      kind: String(step),
    });
  };

  return (
    <>
      {!open && (
        <Button ref={triggerRef} type="button" onClick={() => setAssistanceOpen(true)} className="clara-form-assistant-trigger" aria-label="Demander à Clara" aria-expanded={false} aria-controls="clara-form-assistance">
          <MessageCircle aria-hidden="true" /> Clara
        </Button>
      )}

      {/* Mount once on demand, then keep drafts and the conversation on minimize.
          One responsive panel avoids two competing Clara sessions on mobile. */}
      {hasOpened && (
        <aside id="clara-form-assistance" className="clara-form-assistant-panel home-light" aria-label="Assistance Clara" hidden={!open}>
          <div className="clara-form-assistant-heading">
            <strong>Clara</strong><span>Étape {step}</span>
            <Button ref={minimizeRef} type="button" variant="ghost" size="icon" aria-label="Réduire Clara" onClick={() => setAssistanceOpen(false)}>
              <Minus aria-hidden="true" />
            </Button>
          </div>
          <ClaraConversationBox />
        </aside>
      )}
    </>
  );
}
