/**
 * Vertical (9:16) booking demo video — 25 seconds at 30fps = 750 frames
 * 
 * Timeline (in frames at 30fps):
 * 0-30:    Phone appears
 * 30-80:   Greeting
 * 80-130:  User problem
 * 130-190: Typing → Ask photo
 * 190-260: User uploads photo
 * 260-340: Typing → Diagnosis
 * 340-410: Recommendation
 * 410-480: Why this choice
 * 480-560: Calendar
 * 560-610: Slot ask
 * 610-650: User reply
 * 650-750: Confirmed
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Sequence,
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

  // Phone entrance
  const phoneScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Scroll offset — as more messages appear, scroll up
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
      {/* Background glow */}
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
            {/* Greeting */}
            <Sequence from={30}>
              <AlexBubble text="Bonjour! Comment puis-je vous aider aujourd'hui?" voice />
            </Sequence>

            {/* User problem */}
            <Sequence from={80}>
              <UserBubble text="J'ai un problème de glace sur le toit." />
            </Sequence>

            {/* Typing */}
            {frame >= 130 && frame < 190 && <TypingBubble />}

            {/* Ask photo */}
            <Sequence from={190}>
              <AlexBubble text="Pourriez-vous téléverser une photo pour que je l'analyse?" voice />
            </Sequence>

            {/* User photo */}
            <Sequence from={230}>
              <UserImageBubble />
            </Sequence>

            {/* Typing analysis */}
            {frame >= 260 && frame < 320 && <TypingBubble />}

            {/* Diagnosis */}
            <Sequence from={320}>
              <DiagnosisBubble text="Ah je vois. Barrage de glace + perte de chaleur. Probable manque d'isolation dans l'entretoit." />
            </Sequence>

            {/* Recommendation */}
            <Sequence from={380}>
              <RecommendationBubble text="Je vous propose Isolation Solution Royal." />
            </Sequence>

            {/* Why */}
            <Sequence from={430}>
              <WhyChoiceBubble />
            </Sequence>

            {/* Calendar */}
            <Sequence from={500}>
              <CalendarBubble />
            </Sequence>

            {/* Slot ask */}
            <Sequence from={570}>
              <AlexBubble text="Mardi à 11h, ça vous va?" voice glow />
            </Sequence>

            {/* User reply */}
            <Sequence from={620}>
              <UserBubble text="Oui, parfait." />
            </Sequence>

            {/* Confirmed */}
            <Sequence from={660}>
              <ConfirmedBubble />
            </Sequence>
          </div>
        </PhoneFrame>
      </div>

      {/* UNPRO watermark */}
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
