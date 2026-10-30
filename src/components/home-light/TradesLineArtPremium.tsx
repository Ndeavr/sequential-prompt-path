/**
 * UNPRO homepage trades panorama — approved architectural line-art image
 * (painter, mason, roofer) drifting slowly in a seamless loop.
 * Decorative; pausable; static under prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import panorama from "@/assets/unpro-metiers-architectural.webp.asset.json";
import "./tradesLineArtPremium.css";

const W = 2172;
const H = 724;

export default function TradesLineArtPremium() {
  const root = useRef<HTMLDivElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const sync = () => setAutoPaused(!inView || document.hidden);
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); })
      : null;
    io?.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => { io?.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  const paused = userPaused || autoPaused;

  return (
    <div ref={root} className="utlp-strip" data-paused={paused ? "true" : "false"}>
      <div className="utlp-track" aria-hidden="true">
        {[0, 1].map((i) => (
          <img
            key={i}
            src={panorama.url}
            width={W}
            height={H}
            alt=""
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            className="utlp-img"
            draggable={false}
          />
        ))}
      </div>
      <button
        type="button"
        className="utlp-pause"
        onClick={() => setUserPaused((p) => !p)}
        aria-pressed={userPaused}
        aria-label={userPaused ? "Reprendre l'animation" : "Mettre l'animation en pause"}
      >
        {userPaused ? "▶" : "❚❚"}
      </button>
    </div>
  );
}
