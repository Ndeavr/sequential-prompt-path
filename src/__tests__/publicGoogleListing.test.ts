import { describe, expect, it } from "vitest";
import { publicGoogleListing } from "@/lib/publicGoogleListing";

describe("publicGoogleListing", () => {
  it("accepts the canonical ISR Google Business listing", () => {
    const url = "https://www.google.com/maps/search/?api=1&query_place_id=ChIJVVUZCzLYyEwRcYEVM2uLpA8";
    expect(publicGoogleListing(url)).toBe(url);
  });
  it("accepts valid Google Maps short links", () => {
    expect(publicGoogleListing("https://maps.app.goo.gl/ABCD")).toBe("https://maps.app.goo.gl/ABCD");
  });
  it.each([
    null, undefined, "",
    "javascript:alert(1)",
    "http://www.google.com/maps/search",
    "https://www.google.com.evil.test/maps",
    "https://evil.test/?site=google.com",
    "https://www.google.com/url?q=https://evil.test",
    "https://name:pass@www.google.com/maps/search",
  ])("rejects unsafe or missing listing URLs: %s", (url) => {
    expect(publicGoogleListing(url)).toBeNull();
  });
});
