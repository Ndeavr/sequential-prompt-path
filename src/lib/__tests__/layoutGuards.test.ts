/**
 * Regressions for the layout QA scanner (see docs/standards/PAGE_LAYOUT.md).
 *
 * Two false positives were shipping a permanent FAIL badge on `/`:
 *  1. the QA overlay's own report contains the word "placeholder";
 *  2. content that merely scrolls behind the dock was flagged as hidden.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { scanLayout } from "../layoutGuards";

function setViewport(w: number, h: number) {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
}

function mountPage(opts: { scrollHeight: number; scrollTop: number }) {
  document.body.innerHTML = `
    <div id="root">
      <main data-page-shell="marketing">
        <section id="content">Contenu réel</section>
      </main>
      <nav data-bottom-dock="glass">dock</nav>
      <div data-mobile-qa-overlay>
        <div>placeholder-text: ok</div>
      </div>
    </div>`;
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: opts.scrollHeight,
    configurable: true,
  });
  Object.defineProperty(window, "scrollY", { value: opts.scrollTop, configurable: true });
}

describe("layoutGuards.scanLayout", () => {
  beforeEach(() => {
    setViewport(948, 880);
    document.elementFromPoint = () => document.getElementById("content");
  });

  it("ignores the QA overlay's own report when sniffing placeholder copy", () => {
    mountPage({ scrollHeight: 6000, scrollTop: 0 });
    expect(scanLayout().placeholderText).toEqual([]);
  });

  it("still flags real placeholder copy rendered in the page", () => {
    mountPage({ scrollHeight: 6000, scrollTop: 0 });
    document.getElementById("content")!.textContent = "Bientôt disponible";
    expect(scanLayout().placeholderText.length).toBe(1);
  });

  it("does not flag a placeholder attribute on a real input", () => {
    mountPage({ scrollHeight: 6000, scrollTop: 0 });
    document.getElementById("content")!.innerHTML =
      '<input placeholder="Décrivez votre situation…" aria-label="Votre situation" />';
    expect(scanLayout().placeholderText).toEqual([]);
  });

  it("does not report content behind the dock while the page can still scroll", () => {
    mountPage({ scrollHeight: 6000, scrollTop: 0 });
    expect(scanLayout().contentBehindDock).toBe(false);
  });

  it("reports content behind the dock once the page is scrolled to the bottom", () => {
    mountPage({ scrollHeight: 1000, scrollTop: 120 });
    const content = document.getElementById("content")!;
    const shell = document.querySelector("[data-page-shell]")!;
    shell.getBoundingClientRect = () =>
      ({ top: 0, bottom: 880 }) as DOMRect;
    content.getBoundingClientRect = () => ({ top: 700, bottom: 880 }) as DOMRect;
    expect(scanLayout().contentBehindDock).toBe(true);
  });
});
