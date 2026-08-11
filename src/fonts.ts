import { googleFonts } from "takumi-js/helpers";
import { fontFamily } from "./tokens.js";

/**
 * Load Inter (regular→bold) from Google Fonts. Network call; on failure we fall
 * back to Takumi's built-in sans-serif so a render is still produced — the kind
 * of graceful degradation a real image service wants.
 */
export async function loadFonts() {
  try {
    const fonts = await googleFonts([{ name: fontFamily, weight: "400..700" }]);
    console.log(`✓ loaded ${fontFamily} from Google Fonts`);
    return fonts;
  } catch (err) {
    console.warn(`! font fetch failed, using built-in font (${(err as Error).message})`);
    return undefined;
  }
}
