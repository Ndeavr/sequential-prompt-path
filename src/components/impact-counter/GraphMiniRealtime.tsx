/**
 * GraphMiniRealtime — Compact sparkline with per-intent visual variation.
 * Uses canvas for performance. Updates every 2s.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export type GraphStyle = "smooth" | "stepped" | "dynamic" | "stable" | "steady";

interface Props {
  /** Visual style variant per intent */
  style?: GraphStyle;
  /** Number of data points */
  points?: number;
  /** Base value for mock generation */
  baseValue?: number;
  /** Growth factor per tick */
  growthFactor?: number;
  className?: string;
}

function generatePoint(prev: number, style: GraphStyle, base: number): number {
  const noise = (Math.random() - 0.5) * 2;
  switch (style) {
    case "smooth":
      return prev + base * 0.002 + noise * base * 0.003;
    case "stepped":
      return prev + base * 0.003 + (Math.random() > 0.7 ? base * 0.008 : 0);
    case "dynamic":
      return prev + base * 0.004 + noise * base * 0.008;
    case "stable":
      return prev + base * 0.0015 + noise * base * 0.001;
    case "steady":
      return prev + base * 0.002 + noise * base * 0.0015;
    default:
      return prev + base * 0.002;
  }
}

export default function GraphMiniRealtime({
  style = "smooth",
  points = 30,
  baseValue = 100,
  growthFactor = 1,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>([]);

  // Initialize data
  if (dataRef.current.length === 0) {
    let v = baseValue;
    for (let i = 0; i < points; i++) {
      v = generatePoint(v, style, baseValue);
      dataRef.current.push(v);
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const data = dataRef.current;
    const min = Math.min(...data) * 0.98;
    const max = Math.max(...data) * 1.02;
    const range = max - min || 1;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "hsla(222, 100%, 61%, 0.15)");
    grad.addColorStop(1, "hsla(222, 100%, 61%, 0.0)");

    // Path
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else {
        if (style === "stepped") {
          const prevX = ((i - 1) / (data.length - 1)) * w;
          ctx.lineTo(x, ctx.getLineDash.length > 0 ? y : y);
        }
        ctx.lineTo(x, y);
      }
    });

    // Fill area
    const lastX = w;
    const firstX = 0;
    ctx.lineTo(lastX, h);
    ctx.lineTo(firstX, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "hsl(222, 100%, 61%)";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    const lastV = data[data.length - 1];
    const dotX = w;
    const dotY = h - ((lastV - min) / range) * h * 0.8 - h * 0.1;
    ctx.beginPath();
    ctx.arc(dotX - 1, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "hsl(222, 100%, 61%)";
    ctx.fill();
  }, [style]);

  useEffect(() => {
    draw();
    const interval = setInterval(() => {
      const data = dataRef.current;
      const last = data[data.length - 1];
      data.push(generatePoint(last, style, baseValue));
      if (data.length > points) data.shift();
      draw();
    }, 2000);
    return () => clearInterval(interval);
  }, [draw, style, baseValue, points]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-10", className)}
      style={{ display: "block" }}
    />
  );
}
