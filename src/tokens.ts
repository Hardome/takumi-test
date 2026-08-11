/**
 * Design tokens — expressed as Tailwind class fragments.
 *
 * Takumi styles JSX with Tailwind utilities via the `tw` prop. Rule of thumb it
 * enforces: utilities and arbitrary *values* (`bg-[#111827]`, `w-[320px]`,
 * `bg-[conic-gradient(...)]`) work; arbitrary *property* syntax (`[color:red]`)
 * does not. So tokens here are class strings built from one `hex` palette — the
 * single source of truth. Change a hex, and every `tw` that references the token
 * updates.
 */

export const hex = {
  bg: "#0b0f17",
  surface: "#111827",
  surfaceAlt: "#0e1420",
  border: "#1f2937",
  text: "#e5e7eb",
  textMuted: "#9ca3af",
  textFaint: "#6b7280",
  brand: "#6366f1",
  brandSoft: "#312e81",
  success: "#22c55e",
  successSoft: "#14321f",
  warning: "#f59e0b",
  warningSoft: "#3a2a0a",
  danger: "#ef4444",
  dangerSoft: "#3a1414",
} as const;

/** Semantic Tailwind class tokens, derived from `hex`. */
export const tw = {
  pageBg: `bg-[${hex.bg}]`,
  surface: `bg-[${hex.surface}]`,
  surfaceAlt: `bg-[${hex.surfaceAlt}]`,
  border: `border-[${hex.border}]`,
  text: `text-[${hex.text}]`,
  textMuted: `text-[${hex.textMuted}]`,
  textFaint: `text-[${hex.textFaint}]`,
  brandBg: `bg-[${hex.brand}]`,
  brandSoftBg: `bg-[${hex.brandSoft}]`,
  brandBorder: `border-[${hex.brand}]`,
} as const;

/** Status → Tailwind classes for the pill badge. */
export const statusTokens = {
  active: { dot: `bg-[${hex.success}]`, text: `text-[${hex.success}]`, bg: `bg-[${hex.successSoft}]`, label: "Active" },
  pending: { dot: `bg-[${hex.warning}]`, text: `text-[${hex.warning}]`, bg: `bg-[${hex.warningSoft}]`, label: "Pending" },
  churned: { dot: `bg-[${hex.danger}]`, text: `text-[${hex.danger}]`, bg: `bg-[${hex.dangerSoft}]`, label: "Churned" },
} as const;

export type StatusKey = keyof typeof statusTokens;

/** Canvas presets — OG image dimensions come from the central size config. */
export { config } from "./config.js";
import { config } from "./config.js";
export const canvas = {
  og: config.og,
} as const;

export const fontFamily = "Inter";
