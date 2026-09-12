import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProjectVideoCard from "@/features/renovationEstimator/ProjectVideoCard";

const video: {
  id: string;
  url: string;
  title: string;
  poster: string | null;
  description: string | null;
} = {
  id: "v1",
  url: "https://cdn.example.com/reno.mp4",
  title: "Rénovation de cuisine",
  poster: null,
  description: null,
};

let observed: Array<(entries: { isIntersecting: boolean }[]) => void> = [];

beforeEach(() => {
  observed = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        observed.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectVideoCard", () => {
  it("ne lit jamais automatiquement et reste muet avant le clic", () => {
    render(<ProjectVideoCard video={video as never} />);
    const el = screen.getByTestId("project-video") as HTMLVideoElement;
    expect(el.autoplay).toBe(false);
    expect(el.muted).toBe(true);
    expect(el.getAttribute("controls")).toBeNull();
    expect(el.getAttribute("preload")).toBe("none");
    expect(el.getAttribute("src")).toBeNull();
  });

  it("appelle play() de façon synchrone dans le même geste", () => {
    const play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: play,
    });
    const onStarted = vi.fn();
    render(<ProjectVideoCard video={video as never} onStarted={onStarted} />);
    const button = screen.getByTestId("project-video-play");
    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(1);
    const el = screen.getByTestId("project-video") as HTMLVideoElement;
    expect(el.getAttribute("src")).toBe(video.url);
    expect(onStarted).not.toHaveBeenCalled();
    fireEvent.play(el);
    expect(onStarted).toHaveBeenCalledWith("v1");
    fireEvent.play(el);
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("met la lecture en pause lorsque la carte quitte l'écran", () => {
    const pause = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "pause", {
      configurable: true,
      value: pause,
    });
    render(<ProjectVideoCard video={video as never} />);
    // Second observateur = pause hors écran.
    observed[1]?.([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();
  });

  it("signale la fin réelle de la vidéo", () => {
    const onCompleted = vi.fn();
    render(<ProjectVideoCard video={video as never} onCompleted={onCompleted} />);
    fireEvent.ended(screen.getByTestId("project-video"));
    expect(onCompleted).toHaveBeenCalledWith("v1");
  });

  it("reste accessible au clavier", () => {
    const play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: play,
    });
    render(<ProjectVideoCard video={video as never} />);
    const button = screen.getByLabelText(/Lire la vidéo/i);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(play).toHaveBeenCalled();
  });
});
