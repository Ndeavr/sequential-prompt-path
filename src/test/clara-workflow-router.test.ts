import { describe, expect, it } from "vitest";
import { detectClaraWorkflowIntent } from "@/services/alexIntentClassifier";
import { nextWorkflowState, readWorkflow, type ClaraWorkflowState } from "@/services/clara/claraWorkflow";

describe("Clara — routeur d'intention", () => {
  it("reconnaît l'onboarding affilié", () => {
    expect(detectClaraWorkflowIntent("Je veux devenir affilié.").intent).toBe("affiliate_onboarding");
    expect(detectClaraWorkflowIntent("Comment fonctionne le programme d'affiliation?").intent).toBe(
      "affiliate_onboarding",
    );
  });

  it("reconnaît l'onboarding entrepreneur", () => {
    expect(detectClaraWorkflowIntent("Je suis entrepreneur en peinture à Laval.").intent).toBe(
      "contractor_onboarding",
    );
  });

  it("reconnaît la vérification d'entrepreneur et la comparaison de soumissions", () => {
    expect(detectClaraWorkflowIntent("Peux-tu vérifier cet entrepreneur?").intent).toBe(
      "contractor_verification",
    );
    expect(detectClaraWorkflowIntent("Compare mes trois soumissions.").intent).toBe("quote_comparison");
  });

  it("ne transforme jamais une ville seule en recherche d'entrepreneur", () => {
    expect(detectClaraWorkflowIntent("Montréal").intent).toBe("general_question");
  });
});

describe("Clara — mémoire de workflow", () => {
  const onboarding: ClaraWorkflowState = {
    intent: "contractor_onboarding",
    step: "services",
    next_action: "confirmer les services",
    suspended: [],
  };

  it("démarre un parcours quand il n'y en a aucun", () => {
    const { state, events } = nextWorkflowState(null, "affiliate_onboarding");
    expect(state.intent).toBe("affiliate_onboarding");
    expect(events).toContain("workflow_started");
  });

  it("conserve l'étape exacte quand l'intention ne change pas", () => {
    const { state, events } = nextWorkflowState(onboarding, "contractor_onboarding");
    expect(state.step).toBe("services");
    expect(events).toHaveLength(0);
  });

  it("ne suspend pas le parcours pour une simple question", () => {
    const { state } = nextWorkflowState(onboarding, "general_question");
    expect(state.intent).toBe("contractor_onboarding");
    expect(state.step).toBe("services");
  });

  it("suspend l'onboarding pour un design, puis reprend à l'étape exacte", () => {
    const paused = nextWorkflowState(onboarding, "design_generation");
    expect(paused.state.intent).toBe("design_generation");
    expect(paused.events).toContain("workflow_paused");
    expect(paused.state.suspended?.[0]).toMatchObject({
      intent: "contractor_onboarding",
      step: "services",
    });

    const resumed = nextWorkflowState(paused.state, "contractor_onboarding");
    expect(resumed.state.intent).toBe("contractor_onboarding");
    expect(resumed.state.step).toBe("services");
    expect(resumed.state.next_action).toBe("confirmer les services");
    expect(resumed.events).toContain("workflow_resumed");
  });

  it("lit le workflow depuis le contexte de session canonique", () => {
    expect(readWorkflow({ workflow: onboarding })?.intent).toBe("contractor_onboarding");
    expect(readWorkflow({})).toBeNull();
  });
});
