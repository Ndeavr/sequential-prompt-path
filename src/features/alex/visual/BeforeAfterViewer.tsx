/**
 * BeforeAfterViewer — Slider clip-path comparison.
 */
import { useRef, useState } from "react";

interface Props {
  before: string;
  after: string;
  height?: number;
}

export default function BeforeAfterViewer({ before, after, height = 240 }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-2xl border border-border select-none touch-none"
      style={{ height }}
      onMouseMove={(e) => e.buttons === 1 && move(e.clientX)}
      onTouchMove={(e) => move(e.touches[0].clientX)}
      onClick={(e) => move(e.clientX)}
    >
      <img src={after} alt="Après" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <img
        src={before}
        alt="Avant"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
          ⇆
        </div>
      </div>
      <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white">Avant</span>
      <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-primary-foreground">Après</span>
    </div>
  );
}
