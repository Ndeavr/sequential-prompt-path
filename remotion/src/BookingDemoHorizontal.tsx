/**
 * Horizontal (16:9) booking demo — phone centered with side text
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

export const BookingDemoHorizontal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const scrollOffset = interpolate(
    frame,
    [0, 130, 260, 340, 410, 480, 560, 650],
    [0, 0, -30, -90, -160, -250, -350, -420],
    { extrapolateRight: "clamp" }
  );

  const status = frame < 650 ? (frame > 30 ? "En ligne · Parle…" : "En ligne") : "Conversation terminée";

  const titleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [20, 50], [20, 0], { extrapolateRight: "clamp" });

  const steps = [
    { label: "📸 Photo", from: 230, to: 320 },
    { label: "🔍 Diagnostic", from: 320, to: 380 },
    { label: "⭐ Recommandation", from: 380, to: 500 },
    { label: "📅 Calendrier", from: 500, to: 620 },
    { label: "✅ Confirmé", from: 660, to: 750 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 60% 50%, rgba(59,130,246,0.06) 0%, ${COLORS.bg} 70%)`,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Left side — branding */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: "translateY(-50%)",
          width: 420,
          opacity: titleOpacity,
        }}
      >
        <div style={{ transform: `translateY(${titleY}px)` }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.primary,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Alex en action
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.text, lineHeight: 1.2 }}>
            Photo. Diagnostic.<br />Rendez-vous.
          </div>
          <div style={{ fontSize: 15, color: COLORS.textMuted, marginTop: 16, lineHeight: 1.6 }}>
            Alex identifie le problème, recommande le bon professionnel et
            propose un créneau — en quelques secondes.
          </div>

          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((step, i) => {
              const isActive = frame >= step.from && frame < step.to;
              const isDone = frame >= step.to;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? COLORS.primary : isDone ? COLORS.success : COLORS.textDim,
                    opacity: frame >= step.from - 30 ? 1 : 0.3,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isActive ? COLORS.primary : isDone ? COLORS.success : COLORS.textDim,
                      boxShadow: isActive ? `0 0 12px ${COLORS.primaryGlow}` : "none",
                    }}
                  />
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phone — right side */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: "50%",
          transform: `translateY(-50%) scale(${interpolate(phoneScale, [0, 1], [0.92, 1])})`,
          opacity: phoneOpacity,
          width: 380,
          height: 780,
        }}
      >
        <PhoneFrame width={380} height={780} headerStatus={status}>
          <div
            style={{
              transform: `translateY(${scrollOffset}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 11,
            }}
          >
            {frame >= 30 && <AlexBubble text="Bonjour! Comment puis-je vous aider aujourd'hui?" voice />}
            {frame >= 80 && <UserBubble text="J'ai un problème de glace sur le toit." />}
            {frame >= 130 && frame < 190 && <TypingBubble />}
            {frame >= 190 && <AlexBubble text="Pourriez-vous téléverser une photo pour que je l'analyse?" voice />}
            {frame >= 230 && <UserImageBubble />}
            {frame >= 260 && frame < 320 && <TypingBubble />}
            {frame >= 320 && <DiagnosisBubble text="Barrage de glace + perte de chaleur. Probable manque d'isolation." />}
            {frame >= 380 && <RecommendationBubble text="Je vous propose Isolation Solution Royal." />}
            {frame >= 430 && <WhyChoiceBubble />}
            {frame >= 500 && <CalendarBubble />}
            {frame >= 570 && <AlexBubble text="Mardi à 11h, ça vous va?" voice glow />}
            {frame >= 620 && <UserBubble text="Oui, parfait." />}
            {frame >= 660 && <ConfirmedBubble />}
          </div>
        </PhoneFrame>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 80,
          fontSize: 12,
          fontWeight: 700,
          color: "rgba(241,245,249,0.1)",
          letterSpacing: 4,
        }}
      >
        UNPRO
      </div>
    </AbsoluteFill>
  );
};
