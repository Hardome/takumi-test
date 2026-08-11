/**
 * Example: an animated WebP via renderAnimation — Tailwind (`tw`) for every
 * visual; the only `style` left is the `animation` shorthand, since it names
 * custom @keyframes passed to the renderer (not expressible as a utility).
 *
 * CSS @keyframes are declared once and sampled at `fps` across the scene's
 * duration: a rotating conic ring, three staggered pulsing dots, and a bar that
 * sweeps a highlight. No frame-by-frame code.
 */
import { renderAnimation } from "takumi-js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { hex, tw } from "../tokens.js";
import { loadFonts } from "../fonts.js";
import { outDir } from "../gallery.js";

export async function motion() {
  const fonts = await loadFonts();

  const Dot = ({ delay }: { delay: number }) => (
    <div tw={`w-[18px] h-[18px] rounded-full ${tw.brandBg}`} style={{ animation: `pulse 1.2s ${delay}s ease-in-out infinite` }} />
  );

  const webp = await renderAnimation({
    width: 640,
    height: 360,
    fps: 30,
    format: "webp",
    keyframes: {
      spin: { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
      pulse: {
        "0%": { transform: "scale(0.6)", opacity: 0.35 },
        "50%": { transform: "scale(1.15)", opacity: 1 },
        "100%": { transform: "scale(0.6)", opacity: 0.35 },
      },
      sweep: { from: { transform: "translateX(-160px)" }, to: { transform: "translateX(520px)" } },
    },
    scenes: [
      {
        durationMs: 1800,
        node: (
          <div tw={`flex flex-col w-full h-full items-center justify-center gap-6 font-[Inter] ${tw.pageBg}`}>
            {/* rotating conic ring with a masked center */}
            <div
              tw={`flex items-center justify-center w-[140px] h-[140px] rounded-full bg-[conic-gradient(${hex.brand},#22d3ee,${hex.bg})]`}
              style={{ animation: "spin 1s linear infinite" }}
            >
              <div tw={`w-[104px] h-[104px] rounded-full ${tw.pageBg}`} />
            </div>

            <div tw="flex gap-2.5">
              <Dot delay={0} />
              <Dot delay={0.15} />
              <Dot delay={0.3} />
            </div>

            {/* progress track with a moving highlight (clipped by overflow-hidden) */}
            <div tw={`flex w-[360px] h-3 rounded-full overflow-hidden border ${tw.surface} ${tw.border}`}>
              <div
                tw="w-[160px] h-full rounded-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                style={{ animation: "sweep 1.4s linear infinite" }}
              />
            </div>

            <div tw={`text-lg ${tw.textMuted}`}>Rendering…</div>
          </div>
        ),
      },
    ],
  });

  await writeFile(join(outDir, "spinner.webp"), webp);
  console.log(`✓ spinner.webp (${webp.length.toLocaleString()} bytes, animated)`);
}
