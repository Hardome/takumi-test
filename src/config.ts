/**
 * Output size configuration — one place to change how big the rendered images
 * and PDFs are.
 *
 * The API-reference and report generators now emit **physical A4 PDFs**: the
 * page is A4 at 96 dpi and content is authored to fit inside the margins, so
 * takumi-pdf flows it across as many A4 sheets as it needs (no scaling — the
 * renderer paginates on laid-out height). The image demos keep the OG canvas.
 *
 * Any value can be overridden per-run with an env var, e.g.
 *   OG_WIDTH=1600 OG_HEIGHT=840 npm run examples
 *   PAGE_MARGIN_X=32 npm run report
 */

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** A4 in CSS px at 96 dpi — the size takumi-pdf's `size: "a4"` lays out against. */
export const A4 = { width: 794, height: 1123 } as const;

/**
 * Page margins (px) reserved by takumi-pdf. `top`/`bottom` also leave room for
 * the repeating header/footer bands; `left`/`right` set the text measure.
 */
export const pageMargin = {
  top: num(process.env.PAGE_MARGIN_TOP, 56),
  right: num(process.env.PAGE_MARGIN_X, 44),
  bottom: num(process.env.PAGE_MARGIN_BOTTOM, 52),
  left: num(process.env.PAGE_MARGIN_X, 44),
} as const;

/** Usable content width inside the margins — what the page components fill. */
export const CONTENT_WIDTH = A4.width - pageMargin.left - pageMargin.right;

export const config = {
  /** OG canvas used by the paginated tables demo and the examples. */
  og: {
    width: num(process.env.OG_WIDTH, 1200),
    height: num(process.env.OG_HEIGHT, 630),
  },
} as const;
