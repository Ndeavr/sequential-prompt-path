/**
 * Alex 100M — Public API
 */

// Provider
export { AlexProvider } from "./AlexProvider";

// Shell
export { AlexAssistant } from "./AlexAssistant";

// Components
export { AlexOrb } from "./AlexOrb";
export { AlexPanel } from "./AlexPanel";
export { AlexMessageList } from "./AlexMessageList";
export { AlexInput } from "./AlexInput";
export { AlexQuickActions } from "./AlexQuickActions";
export { AlexUploadDropzone } from "./AlexUploadDropzone";
export { AlexSpotlightLayer } from "./AlexSpotlightLayer";

// Store
export { useAlexStore } from "./state/alexStore";

// Hooks
export { useAlexBootstrap } from "./hooks/useAlexBootstrap";
export { useAlexVoice } from "./hooks/useAlexVoice";
export { useAlexSTT } from "./hooks/useAlexSTT";
export { useAlexConversation } from "./hooks/useAlexConversation";
export { useAlexUIBridge } from "./hooks/useAlexUIBridge";
export { useAlexInactivity } from "./hooks/useAlexInactivity";
export { useAlexSessionRestore } from "./hooks/useAlexSessionRestore";
export { useAlexIntentGate } from "./hooks/useAlexIntentGate";
