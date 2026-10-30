/** Decorative hand-drawn line-art loop: one sketched professional morphing across 7 trades. Pure SVG + CSS. */
import { useEffect, useRef } from "react";
import "./tradesLineArt.css";

// Shared figure base (head + torso), redrawn each scene to feel like the same sketch.
const body = "M300 52 C300 44 312 44 312 52 C312 60 300 60 300 52 Z M306 61 C305 76 304 92 306 108 M306 108 C300 122 296 134 292 146 M306 108 C312 122 316 134 320 146";

const scenes: { d: string; accent: string }[] = [
  // 1 painter: arm up holding roller on wall
  { d: `${body} M306 70 C318 64 330 56 340 46 M340 46 L352 40 M346 30 L362 50 M380 20 L380 146`, accent: "M352 34 C366 40 372 70 374 100 C376 120 374 136 372 146 M346 30 C352 26 360 26 362 30" },
  // 2 mason: trowel + brick rows
  { d: `${body} M306 72 C320 78 332 84 342 88 M342 88 L358 82 L352 94 Z`, accent: "M362 146 L430 146 M362 128 L430 128 M362 110 L410 110 M385 146 L385 128 M408 146 L408 128 M374 128 L374 110 M398 128 L398 110" },
  // 3 roofer: roof slope + shingles
  { d: "M318 58 C318 50 330 50 330 58 C330 66 318 66 318 58 Z M324 67 C322 80 318 92 314 104 M314 104 C306 112 298 118 292 124 M314 104 C320 112 326 116 332 118 M324 76 C336 76 348 72 356 66 M220 146 L400 70", accent: "M240 138 L256 131 M268 126 L284 119 M296 114 L312 107 M352 92 L368 85 M372 83 L388 76" },
  // 4 heat pump installer: outdoor unit with fan
  { d: `${body} M306 72 C318 80 330 92 340 100 M306 74 C320 84 334 98 344 112`, accent: "M344 96 L424 96 L424 146 L344 146 Z M384 121 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 M384 105 L384 137 M368 121 L400 121 M372 109 L396 133" },
  // 5 plumber: wrench on pipe
  { d: `${body} M306 74 C318 82 328 88 340 92 M340 92 L352 86 M348 80 L358 92`, accent: "M330 112 L380 112 C392 112 396 108 396 96 L396 40 M330 122 L380 122 C400 122 406 114 406 96 L406 40 M354 106 L354 128" },
  // 6 duct / gutter specialist: ladder + gutter
  { d: `${body} M306 70 C316 60 326 50 334 40`, accent: "M352 146 L372 30 M376 146 L396 30 M356 124 L380 124 M360 100 L384 100 M364 76 L388 76 M368 52 L392 52 M330 30 C360 36 410 36 440 30 L440 22" },
  // 7 real-estate pro: key + house
  { d: `${body} M306 72 C318 70 330 66 340 60 M340 60 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M352 60 L366 60 M362 60 L362 66`, accent: "M380 146 L380 100 L412 74 L444 100 L444 146 Z M404 146 L404 122 L420 122 L420 146" },
];

export default function TradesLineArt() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let visible = true;
    const apply = () => el.classList.toggle("is-paused", !visible || document.hidden);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; apply(); });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", apply); };
  }, []);

  return (
    <div ref={ref} className="trades-lineart" aria-hidden="true">
      <svg viewBox="140 10 360 145" preserveAspectRatio="xMidYMid meet" focusable="false">
        <g className="tla-drift">
          <path className="tla-ground" d="M140 147 C220 145 300 149 380 146 C430 144 470 148 500 147" pathLength={1} />
          {scenes.map((s, i) => (
            <g key={i} className="tla-scene" style={{ animationDelay: `${i * 3.5}s` }}>
              <path className="tla-ink" d={s.d} pathLength={1} style={{ animationDelay: `${i * 3.5}s` }} />
              <path className="tla-accent" d={s.accent} pathLength={1} style={{ animationDelay: `${i * 3.5 + 0.3}s` }} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
