import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { resolveClaraDestination } from "@/services/clara/claraNavigation";
import type { ClaraWorkflowIntent } from "@/services/clara/claraWorkflow";
import { MessageCircle, Minus } from "lucide-react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { Button } from "@/components/ui/button";
import { rememberClaraReferences } from "@/services/clara/claraSession";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

interface ClaraFormAssistantProps {
  form: "contractor_audit" | "affiliate_onboarding" | "account_onboarding" | "page_assistance";
  step?: string | number;
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
    rememberClaraReferences({ workflow: { visible_form: form, visible_step: String(step ?? "assistance") } } as never);
    trackCopilotEvent("clara_form_context_visible", { surface: form, kind: String(step ?? "assistance") });
  }, [form, step]);

  const setAssistanceOpen = (next: boolean) => {
    if (next) setHasOpened(true);
    setOpen(next);
    trackCopilotEvent(next ? "clara_form_assistance_opened" : "clara_form_assistance_closed", {
      surface: form,
      kind: String(step ?? "assistance"),
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
            <strong>Clara</strong><span>{step == null ? "À votre disposition" : `Étape ${step}`}</span>
            <Button ref={minimizeRef} type="button" variant="ghost" size="icon" aria-label="Réduire Clara" onClick={() => setAssistanceOpen(false)}>
              <Minus aria-hidden="true" />
            </Button>
          </div>
          <ClaraConversationBox onDestinationOpened={() => setAssistanceOpen(false)} />
        </aside>
      )}
    </>
  );
}

/** Reuse the same minimized assistant on pages opened by Clara.
 * Audit and affiliate forms already own their contextual assistant. */
export function ClaraPageAssistant() {
  const location = useLocation();
  const state = location.state as { fromClara?: boolean; claraIntent?: ClaraWorkflowIntent } | null;
  if (!state?.fromClara || !state.claraIntent) return null;
  const destination = resolveClaraDestination(state.claraIntent);
  if (destination?.path !== location.pathname || ["/entrepreneurs/audit-ia", "/affilies/onboarding"].includes(location.pathname)) return null;
  return <ClaraFormAssistant key={location.pathname} form="page_assistance" />;
}
