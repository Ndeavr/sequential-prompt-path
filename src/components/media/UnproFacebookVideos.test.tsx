import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UnproFacebookVideos, { UNPRO_NATIVE_VIDEOS, UNPRO_SOCIAL_VIDEOS } from "./UnproFacebookVideos";

const renderSection = (placement: "home" | "entrepreneurs") =>
  render(<MemoryRouter><UnproFacebookVideos placement={placement} /></MemoryRouter>);

describe("UNPRO original video placement", () => {
  it("keeps all four submitted Facebook share URLs as unverified references", () => {
    expect(UNPRO_SOCIAL_VIDEOS.map((video) => video.url)).toEqual([
      "https://www.facebook.com/share/r/1FVwWZCAJe/",
      "https://www.facebook.com/share/v/1F5bARp4AY/",
      "https://www.facebook.com/share/r/1JSifhcEki/",
      "https://www.facebook.com/share/r/1ENvWKkmk9/",
    ]);
  });

  it("places the 16:9 overview video on the active homepage", () => {
    const { container } = renderSection("home");
    const video = screen.getByTestId("unpro-native-video-presentation");
    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("poster", "/videos/unpro/unpro-presentation.jpg");
    expect(video.querySelector("source")).toHaveAttribute("src", "/videos/unpro/unpro-presentation.mp4");
    expect(screen.queryByTestId("unpro-native-video-competence")).toBeNull();
  });

  it("places the three vertical contractor videos together before signup", () => {
    renderSection("entrepreneurs");
    expect(screen.getAllByTestId(/^unpro-native-video-/)).toHaveLength(3);
    expect(screen.getByTestId("unpro-native-video-accote")).toBeInTheDocument();
    expect(screen.getByTestId("unpro-native-video-bons-projets")).toBeInTheDocument();
    expect(screen.getByTestId("unpro-native-video-competence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inscrire mon entreprise/i })).toHaveAttribute("href", "/entrepreneurs/activation-350");
  });

  it("uses site-hosted MP4 paths and no third-party embed", () => {
    expect(UNPRO_NATIVE_VIDEOS).toHaveLength(4);
    for (const video of UNPRO_NATIVE_VIDEOS) {
      expect(video.src).toMatch(/^\/videos\/unpro\/[a-z-]+\.mp4$/);
      expect(video.poster).toMatch(/^\/videos\/unpro\/[a-z-]+\.jpg$/);
    }
    const { container } = renderSection("home");
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows a safe Facebook fallback if a local media file is unavailable", () => {
    const { container } = renderSection("home");
    fireEvent.error(screen.getByTestId("unpro-native-video-presentation"));
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(screen.getByRole("link", { name: /consulter notre page facebook/i })).toHaveAttribute(
      "href", "https://www.facebook.com/Trouvezunpro",
    );
  });
});
