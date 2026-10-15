import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ sendContextualUpdate: vi.fn(), startSession: vi.fn(), endSession: vi.fn(), status: "disconnected", isSpeaking: false }));
vi.mock("@elevenlabs/react", () => ({ useConversation: () => sdk }));
import { useLiveVoice } from "@/hooks/useLiveVoice";
describe("page assistance uses the existing voice transport", () => {
  it("sends contextual updates without restarting a session or requesting a microphone", () => {
    const {result,rerender} = renderHook(() => useLiveVoice());
    act(() => { expect(result.current.updateContext('Page: objectif, montant 35000')).toBe(true); });
    rerender();
    act(() => { expect(result.current.updateContext('Page: proposition, Voir les plans')).toBe(true); });
    expect(sdk.sendContextualUpdate.mock.calls).toEqual([['Page: objectif, montant 35000'], ['Page: proposition, Voir les plans']]);
    expect(sdk.startSession).not.toHaveBeenCalled(); expect(sdk.endSession).not.toHaveBeenCalled();
  });
});
