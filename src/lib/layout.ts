/**
 * UNPRO — Layout Constants
 * Single source of truth for layout dimensions and spacing.
 */

export const layout = {
  /** Max content width */
  maxWidth: "1280px",
  /** Narrow content (forms, single-column) */
  maxWidthNarrow: "720px",
  /** Wide content (dashboards) */
  maxWidthWide: "1440px",
  /** Standard horizontal padding */
  paddingX: "1.25rem", // 20px — matches container padding at mobile
  /** Section vertical gap */
  sectionGap: "3rem", // 48px
  /** Section vertical gap large */
  sectionGapLg: "4.5rem", // 72px
} as const;
