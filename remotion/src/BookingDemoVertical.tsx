/**
 * Vertical (9:16) booking demo video — 25 seconds at 30fps = 750 frames
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { COLORS } from "./theme";
import { PhoneFrame } from "./PhoneFrame";
import {
  AlexBubble,
  UserBubble,
  TypingBubble,
  UserImageBubble,
  DiagnosisBubble,
  RecommendationBubble,
  WhyChoiceBubble,
  CalendarBubble,
  ConfirmedBubble,
} from "./Bubbles";

export const BookingDemoVertical: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const scrollOffset = interpolate(
    frame,
    [0, 130, 260, 340, 410, 480, 560, 650],
    [0, 0, -40, -120, -200, -320, -440, -520],
    { extrapolateRight: "clamp" }
  );

  const status = frame < 650 ? (frame > 30 ? "En ligne · Parle…" : "En ligne") : "Conversation terminée";

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.06) 0%, ${COLORS.bg} 70%)`,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.04)",
          filter: "blur(100px)",
        }}
      />

      <div
        style={{
          opacity: phoneOpacity,
          transform: `scale(${interpolate(phoneScale, [0, 1], [0.92, 1])})`,
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        <PhoneFrame width={1080} height={1920} headerStatus={status}>
          <div style={{ transform: `translateY(${scrollOffset}px)`, display: "flex", flexDirection: "column", gap: 12 }}>
            {frame >= 30 && <AlexBubble text="Bonjour! Comment puis-je vous aider aujourd'hui?" delay={Math.max(0, 30 - frame + 30)} voice />}
            {frame >= 80 && <UserBubble text="J'ai un problème de glace sur le toit." delay={Math.max(0, 80 - frame + 80)} />}
            {frame >= 130 && frame < 190 && <TypingBubble delay={0} />}
            {frame >= 190 && <AlexBubble text="Pourriez-vous téléverser une photo pour que je l'analyse?" delay={Math.max(0, 190 - frame + 190)} voice />}
            {frame >= 230 && <UserImageBubble delay={Math.max(0, 230 - frame + 230)} />}
            {frame >= 260 && frame < 320 && <TypingBubble delay={0} />}
            {frame >= 320 && <DiagnosisBubble text="Ah je vois. Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit." delay={Math.max(0, 320 - frame + 320)} />}
            {frame >= 380 && <RecommendationBubble text="Je vous propose Isolation Solution Royal." delay={Math.max(0, 380 - frame + 380)} />}
            {frame >= 430 && <WhyChoiceBubble delay={Math.max(0, 430 - frame + 430)} />}
            {frame >= 500 && <CalendarBubble delay={Math.max(0, 500 - frame + 500)} />}
            {frame >= 570 && <AlexBubble text="Mardi à 11h, ça vous va?" delay={Math.max(0, 570 - frame + 570)} voice glow />}
            {frame >= 620 && <UserBubble text="Oui, parfait." delay={Math.max(0, 620 - frame + 620)} />}
            {frame >= 660 && <ConfirmedBubble delay={Math.max(0, 660 - frame + 660)} />}
          </div>
        </PhoneFrame>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 14,
          fontWeight: 700,
          color: "rgba(241,245,249,0.15)",
          letterSpacing: 4,
        }}
      >
        UNPRO
      </div>
    </AbsoluteFill>
  );
};
