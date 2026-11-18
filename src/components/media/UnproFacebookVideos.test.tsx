import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import UnproFacebookVideos, { UNPRO_SOCIAL_VIDEOS } from "./UnproFacebookVideos";

describe("UNPRO Facebook video links", () => {
  it("preserves the four user-provided Facebook links without duplicating them", () => {
    expect(UNPRO_SOCIAL_VIDEOS.map((video) => video.url)).toEqual([
      "https://www.facebook.com/share/r/1FVwWZCAJe/",
      "https://www.facebook.com/share/v/1F5bARp4AY/",
      "https://www.facebook.com/share/r/1JSifhcEki/",
      "https://www.facebook.com/share/r/1ENvWKkmk9/",
    ]);
    expect(new Set(UNPRO_SOCIAL_VIDEOS.map((video) => video.url)).size).toBe(4);
  });

  it("shows accessible off-site video cards and no broken Facebook iframe", () => {
    const { container } = render(<UnproFacebookVideos placement="home" />);
    const links = screen.getAllByRole("link");

    expect(links).toHaveLength(4);
    links.forEach((link, index) => {
      expect(link).toHaveAttribute("href", UNPRO_SOCIAL_VIDEOS[index].url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });
});
