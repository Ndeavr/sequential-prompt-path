import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { COLORS } from "./theme";

const useBubbleEntrance = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
  return {
    opacity: s,
    transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
  };
};

/* ─── Avatar ─── */
const Avatar: React.FC<{ pulse?: boolean }> = ({ pulse }) => {
  const frame = useCurrentFrame();
  const pulseScale = pulse
    ? 1 + 0.15 * Math.sin(frame * 0.12)
    : 1;
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.2)",
          border: "1px solid rgba(59,130,246,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: COLORS.primary,
        }}
      >
        A
      </div>
      {pulse && (
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            border: `2px solid rgba(59,130,246,${0.3 * Math.abs(Math.sin(frame * 0.08))})`,
            transform: `scale(${pulseScale})`,
          }}
        />
      )}
    </div>
  );
};

/* ─── Voice Waveform ─── */
const VoiceWaveform: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 2.5,
              height: 3 + 5 * Math.abs(Math.sin(frame * 0.15 + i * 0.8)),
              borderRadius: 2,
              background: "rgba(59,130,246,0.4)",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 4 }}>🔇</div>
    </div>
  );
};

/* ─── Typing dots ─── */
export const TypingBubble: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-end", gap: 8 }}>
      <Avatar pulse />
      <div
        style={{
          borderRadius: "16px 16px 16px 4px",
          padding: "12px 18px",
          background: COLORS.bgMuted,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          gap: 5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: COLORS.textDim,
              transform: `translateY(${-3 * Math.abs(Math.sin((frame - delay) * 0.15 + i * 0.6))}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Alex Text ─── */
export const AlexBubble: React.FC<{
  text: string;
  delay?: number;
  glow?: boolean;
  voice?: boolean;
}> = ({ text, delay = 0, glow, voice }) => {
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-end", gap: 8 }}>
      <Avatar pulse={voice} />
      <div
        style={{
          maxWidth: "80%",
          borderRadius: "16px 16px 16px 4px",
          padding: "12px 16px",
          background: COLORS.bgBubbleAlex,
          border: `1px solid ${glow ? "rgba(59,130,246,0.3)" : COLORS.border}`,
          boxShadow: glow ? `0 0 24px -6px ${COLORS.primaryGlow}` : "none",
          fontSize: 13,
          lineHeight: 1.5,
          color: COLORS.text,
        }}
      >
        {text}
        {voice && <VoiceWaveform />}
      </div>
    </div>
  );
};

/* ─── User Text ─── */
export const UserBubble: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "75%",
          borderRadius: "16px 16px 4px 16px",
          padding: "10px 16px",
          background: COLORS.bgBubbleUser,
          fontSize: 13,
          lineHeight: 1.5,
          color: "#fff",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ─── User Image ─── */
export const UserImageBubble: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "75%",
          borderRadius: "16px 16px 4px 16px",
          overflow: "hidden",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            width: 260,
            height: 180,
            background: "linear-gradient(135deg, #1e3a5f 0%, #2d4a7a 50%, #3b5998 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Ice dam illustration */}
          <div style={{ fontSize: 48 }}>🏠❄️</div>
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              fontSize: 9,
              color: COLORS.textMuted,
              background: "rgba(0,0,0,0.5)",
              padding: "3px 8px",
              borderRadius: 12,
            }}
          >
            📷 Photo uploadée
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Diagnosis ─── */
export const DiagnosisBubble: React.FC<{ text: string; delay?: number }> = ({
  text,
  delay = 0,
}) => {
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-end", gap: 8 }}>
      <Avatar pulse />
      <div style={{ maxWidth: "85%" }}>
        <div
          style={{
            borderRadius: "16px 16px 16px 4px",
            padding: "12px 16px",
            background: COLORS.bgBubbleAlex,
            border: `1px solid ${COLORS.border}`,
            boxShadow: `0 0 20px -6px rgba(59,130,246,0.15)`,
            fontSize: 13,
            lineHeight: 1.5,
            color: COLORS.text,
          }}
        >
          {text}
          <VoiceWaveform />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <BadgePill label="⚠️ Problème détecté" color={COLORS.warning} />
          <BadgePill label="⭐ 92% confiance" color={COLORS.primary} />
        </div>
      </div>
    </div>
  );
};

/* ─── Recommendation ─── */
export const RecommendationBubble: React.FC<{
  text: string;
  delay?: number;
}> = ({ text, delay = 0 }) => {
  const style = useBubbleEntrance(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-end", gap: 8 }}>
      <Avatar />
      <div style={{ maxWidth: "85%" }}>
        <div
          style={{
            borderRadius: "16px 16px 16px 4px",
            padding: "12px 16px",
            background: COLORS.bgBubbleAlex,
            border: `1px solid rgba(59,130,246,0.2)`,
            boxShadow: `0 0 24px -6px ${COLORS.primaryGlow}`,
            fontSize: 13,
            lineHeight: 1.5,
            color: COLORS.text,
          }}
        >
          <div>{text}</div>
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(59,130,246,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 12,
                color: COLORS.primary,
              }}
            >
              92
            </div>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}
              >
                Isolation Solution Royal
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>
                📍 Laval / Montréal
              </div>
            </div>
          </div>
          <VoiceWaveform />
        </div>
        <div style={{ marginTop: 6 }}>
          <BadgePill label="⭐ Recommandé UNPRO" color={COLORS.primary} />
        </div>
      </div>
    </div>
  );
};

/* ─── Why This Choice ─── */
export const WhyChoiceBubble: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useBubbleEntrance(delay);
  const points = [
    "Spécialiste isolation d'entretoit",
    "Habitué aux barrages de glace",
    "Disponible dans votre secteur",
    "Intervention possible cette semaine",
  ];
  return (
    <div style={{ ...style, marginLeft: 40 }}>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(26,34,54,0.5)",
          padding: 14,
        }}
      >
        <BadgePill label="✅ Pourquoi ce choix" color={COLORS.success} />
        <div
          style={{
            fontSize: 11,
            fontStyle: "italic",
            color: "rgba(241,245,249,0.8)",
            marginTop: 6,
            marginBottom: 8,
          }}
        >
          C'est en plein dans leurs cordes.
        </div>
        {points.map((pt, i) => {
          const itemOpacity = interpolate(
            spring({
              frame: frame - delay - 8 - i * 5,
              fps,
              config: { damping: 20 },
            }),
            [0, 1],
            [0, 1]
          );
          return (
            <div
              key={i}
              style={{
                opacity: itemOpacity,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: COLORS.textMuted,
                marginTop: 4,
              }}
            >
              <span style={{ color: COLORS.success }}>✓</span> {pt}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Calendar ─── */
export const CalendarBubble: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = useBubbleEntrance(delay);
  const slots = [
    { day: "Lun 14 avr", time: "15h30", rec: false },
    { day: "Mar 15 avr", time: "11h00", rec: true },
    { day: "Mer 16 avr", time: "9h30", rec: false },
    { day: "Jeu 17 avr", time: "14h00", rec: false },
  ];
  return (
    <div style={{ ...style, marginLeft: 40 }}>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(26,34,54,0.5)",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 14 }}>📅</span>
          <span
            style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}
          >
            Créneaux disponibles
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {slots.map((slot, i) => {
            const spr = spring({
              frame: frame - delay - 6 - i * 4,
              fps,
              config: { damping: 18 },
            });
            return (
              <div
                key={i}
                style={{
                  opacity: spr,
                  transform: `scale(${interpolate(spr, [0, 1], [0.94, 1])})`,
                  borderRadius: 10,
                  padding: "10px 8px",
                  textAlign: "center",
                  border: `1px solid ${slot.rec ? "rgba(59,130,246,0.4)" : COLORS.border}`,
                  background: slot.rec
                    ? "rgba(59,130,246,0.1)"
                    : "rgba(26,34,54,0.5)",
                  boxShadow: slot.rec
                    ? `0 0 14px -3px ${COLORS.primaryGlow}`
                    : "none",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: slot.rec ? COLORS.primary : "rgba(241,245,249,0.7)",
                  }}
                >
                  {slot.day}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: slot.rec
                      ? "rgba(59,130,246,0.7)"
                      : COLORS.textMuted,
                  }}
                >
                  {slot.time}
                </div>
                {slot.rec && (
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      right: 6,
                      fontSize: 8,
                      fontWeight: 800,
                      background: COLORS.primary,
                      color: "#fff",
                      padding: "2px 6px",
                      borderRadius: 8,
                    }}
                  >
                    Suggéré
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─── Booking Confirmed ─── */
export const ConfirmedBubble: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 160 } });
  const checkScale = spring({
    frame: frame - delay - 8,
    fps,
    config: { damping: 10, stiffness: 200 },
  });
  return (
    <div
      style={{
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.94, 1])})`,
        margin: "0 auto",
        maxWidth: "85%",
      }}
    >
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${COLORS.successBorder}`,
          background: COLORS.successBg,
          padding: "20px 16px",
          textAlign: "center",
          boxShadow: `0 0 36px -8px ${COLORS.successGlow}`,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            margin: "0 auto 12px",
            borderRadius: "50%",
            background: "rgba(34,197,94,0.15)",
            border: `1px solid ${COLORS.successBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${checkScale})`,
            fontSize: 22,
          }}
        >
          ✓
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.text }}>
          Rendez-vous confirmé
        </div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
          Mardi 11h
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span style={{ fontWeight: 600, color: "rgba(241,245,249,0.8)" }}>
            Isolation Solution Royal
          </span>
          <span>·</span>
          <span>📍 Laval</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Badge Pill ─── */
const BadgePill: React.FC<{ label: string; color: string }> = ({
  label,
  color,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 600,
      color,
      background: `${color}15`,
      border: `1px solid ${color}30`,
    }}
  >
    {label}
  </span>
);
