/**
 * Output size configuration — one place to change how big the rendered images
 * are. Every generator reads its dimensions from here.
 *
 * Takumi lays content out in fixed pixels and reflows to the canvas (`w-full` /
 * `h-full`), so these values are the real size knob: widen `docs.width` and the
 * doc pages get wider and reflow; the height estimators adapt so nothing clips.
 * (Takumi's `devicePixelRatio` is a no-op through the managed renderer, so there
 * is no separate "scale" — change the dimensions.)
 *
 * Any value can be overridden per-run with an env var, e.g.
 *   DOCS_WIDTH=1600 npm run docs
 *   OG_WIDTH=1600 OG_HEIGHT=840 npm run examples
 */

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const reportWidth = num(process.env.REPORT_WIDTH, 1240);

/** Fixed page height for paged report mode, derived from a preset or explicit px. */
function resolvePageHeight(width: number): number {
  const explicit = Number(process.env.REPORT_PAGE_HEIGHT);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  switch ((process.env.REPORT_PAGE ?? "").toLowerCase()) {
    case "a4":
      return Math.round((width * 297) / 210); // portrait A4 ratio at this width
    case "letter":
      return Math.round((width * 11) / 8.5);
    default:
      return 0; // disabled
  }
}

export const config = {
  /** OG canvas used by the paginated tables demo and the examples. */
  og: {
    width: num(process.env.OG_WIDTH, 1200),
    height: num(process.env.OG_HEIGHT, 630),
  },

  /** API reference pages (per-operation height is content-driven). */
  docs: {
    width: num(process.env.DOCS_WIDTH, 1240),
    coverHeight: num(process.env.DOCS_COVER_HEIGHT, 940),
  },

  /** OpenAPI report pages. */
  report: {
    width: reportWidth,
    titleHeight: num(process.env.REPORT_TITLE_HEIGHT, 940),
    // Fixed page height for "paged" mode (content flows across A4-like pages).
    // 0 = disabled: one content-height page per service (the default).
    // Enable with REPORT_PAGE=a4|letter or REPORT_PAGE_HEIGHT=<px>.
    pageHeight: resolvePageHeight(reportWidth),
  },
} as const;

/** Reference width the height estimators were tuned against. */
export const BASE_WIDTH = 1240;
