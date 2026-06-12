import { describe, it, expect } from "vitest";
import { normalizeInput, normalizeFormRecord } from "../normalizeInput";

describe("normalizeInput — url", () => {
  it.each([
    ["unpro.ca", "https://unpro.ca"],
    ["www.unpro.ca", "https://unpro.ca"],
    ["WWW.UNPRO.CA", "https://unpro.ca"],
    ["http://unpro.ca", "https://unpro.ca"],
    ["https://unpro.ca", "https://unpro.ca"],
    ["https://unpro.ca/", "https://unpro.ca"],
    ["https // unpro.ca", "https://unpro.ca"],
    ["http // unpro.ca", "https://unpro.ca"],
    ["https:/unpro.ca", "https://unpro.ca"],
    ["https:\\\\unpro.ca", "https://unpro.ca"],
    ["  unpro.ca  ", "https://unpro.ca"],
  ])("%s → %s", (input, expected) => {
    const r = normalizeInput(input, "url");
    expect(r.value).toBe(expected);
    expect(r.valid).toBe(true);
  });
});

describe("normalizeInput — phone", () => {
  it.each([
    ["(514) 555 - 1212", "+15145551212"],
    ["514-555-1212", "+15145551212"],
    ["+1 514 555-1212", "+15145551212"],
    ["1.514.555.1212", "+15145551212"],
    [" 5145551212 ", "+15145551212"],
  ])("%s → %s", (input, expected) => {
    const r = normalizeInput(input, "phone");
    expect(r.value).toBe(expected);
    expect(r.valid).toBe(true);
  });

  it("rejects short numbers but does not throw", () => {
    const r = normalizeInput("514555", "phone");
    expect(r.valid).toBe(false);
  });
});

describe("normalizeInput — email", () => {
  it("trims and lowercases", () => {
    const r = normalizeInput("  Jean@FOO.com ", "email");
    expect(r.value).toBe("jean@foo.com");
    expect(r.valid).toBe(true);
  });
});

describe("normalizeInput — postal_code", () => {
  it.each([
    ["h1h1h1", "H1H 1H1"],
    [" H1H 1H1 ", "H1H 1H1"],
    ["h1h-1h1", "H1H 1H1"],
  ])("%s → %s", (input, expected) => {
    const r = normalizeInput(input, "postal_code");
    expect(r.value).toBe(expected);
    expect(r.valid).toBe(true);
  });
});

describe("normalizeInput — names", () => {
  it("collapses repeated spaces", () => {
    const r = normalizeInput("Jean   Tremblay", "name");
    expect(r.value).toBe("Jean Tremblay");
  });
});

describe("normalizeInput — rbq / neq", () => {
  it("rbq formats 10 digits", () => {
    expect(normalizeInput("1234 5678 90", "rbq").value).toBe("1234-5678-90");
    expect(normalizeInput("1234-5678-90", "rbq").value).toBe("1234-5678-90");
  });
  it("neq strips separators", () => {
    expect(normalizeInput("1234 567 890", "neq").value).toBe("1234567890");
  });
});

describe("normalizeInput — text truncation", () => {
  it("truncates without rejection", () => {
    const big = "a".repeat(10_000);
    const r = normalizeInput(big, "text");
    expect(r.value.length).toBe(5000);
    expect(r.valid).toBe(true);
  });
});

describe("normalizeFormRecord", () => {
  it("normalizes keys by heuristic", () => {
    const { normalized, changed } = normalizeFormRecord({
      email: "  Foo@BAR.com ",
      phone: "(514) 555-1212",
      website: "unpro.ca",
      first_name: "Jean   Tremblay",
      postal_code: "h1h1h1",
      other: "hello   world",
    });
    expect(normalized.email).toBe("foo@bar.com");
    expect(normalized.phone).toBe("+15145551212");
    expect(normalized.website).toBe("https://unpro.ca");
    expect(normalized.first_name).toBe("Jean Tremblay");
    expect(normalized.postal_code).toBe("H1H 1H1");
    expect(normalized.other).toBe("hello world");
    expect(changed.email).toBe(true);
  });
});
