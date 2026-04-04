import React from "react";
import { COLORS } from "./theme";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width: number;
  height: number;
  headerStatus: string;
}> = ({ children, width, height, headerStatus }) => {
  const phoneW = Math.min(width * 0.85, 420);
  const phoneH = height * 0.82;
  const borderRadius = 40;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: phoneW,
        height: phoneH,
        borderRadius,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bgCard,
        boxShadow: `0 40px 100px -20px rgba(0,0,0,0.6), 0 0 80px -20px ${COLORS.primaryGlow}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${COLORS.borderLight}`,
          background: "rgba(26,34,54,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(59,130,246,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: COLORS.primary,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
              Alex · UNPRO
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMuted }}>
              {headerStatus}
            </div>
          </div>
        </div>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: COLORS.success,
          }}
        />
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
};
