import { afterEach, describe, expect, it, vi } from "vitest";
import { createStreamingTyping } from "@/services/clara/claraTyping";

afterEach(() => vi.useRealTimers());
describe("Clara — stream unique", () => {
  it("révèle progressivement les jetons sans retrait ni doublon", async () => {
    vi.useFakeTimers();
    const values: string[] = [];
    const reveal = createStreamingTyping((value) => values.push(value));
    reveal.update("Bonjour");
    await vi.advanceTimersByTimeAsync(150);
    expect(values.at(-1)?.length).toBeLessThan(7);
    reveal.update("Bonjour, on poursuit votre projet.");
    reveal.update("Bon"); // stale transport frame
    const done = reveal.finish();
    await vi.runAllTimersAsync();
    await done;
    expect(values.at(-1)).toBe("Bonjour, on poursuit votre projet.");
    values.forEach((value, index) => expect(value.startsWith(values[index - 1] ?? "")).toBe(true));
  });
  it("cesse toute écriture après annulation", async () => {
    vi.useFakeTimers();
    const frame = vi.fn();
    const reveal = createStreamingTyping(frame);
    reveal.update("Réponse à annuler");
    await vi.advanceTimersByTimeAsync(100);
    reveal.cancel();
    const count = frame.mock.calls.length;
    await vi.runAllTimersAsync();
    expect(frame).toHaveBeenCalledTimes(count);
  });
});