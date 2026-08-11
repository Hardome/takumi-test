/**
 * Example: a marketing / OG hero card — Tailwind (`tw`) syntax throughout.
 * Difficult bits: layered gradients, an absolutely-positioned radial glow,
 * gradient-filled text (`bg-clip-text`), a glass panel (`backdrop-blur`),
 * shadow, tracking, emoji.
 */
import { render } from "takumi-js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { canvas, tw } from "../tokens.js";
import { loadFonts } from "../fonts.js";
import { outDir } from "../gallery.js";

export async function hero() {
  const fonts = await loadFonts();

  const png = await render(
    <div tw="relative flex flex-col w-full h-full font-[Inter] p-[72px] bg-[linear-gradient(135deg,#0b0f17_0%,#131a2b_55%,#1b1140_100%)]">
      {/* radial brand glow, layered above the base via absolute positioning */}
      <div tw="absolute -top-[180px] -right-[160px] w-[620px] h-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.55),rgba(99,102,241,0))]" />

      {/* eyebrow */}
      <div tw="flex text-lg font-semibold uppercase tracking-[4px] text-[#a5b4fc]">
        Takumi · Release 2.6
      </div>

      {/* headline */}
      <div tw={`flex flex-col mt-4 text-[84px] font-bold leading-none ${tw.text}`}>
        <div tw="flex">Render JSX to images.</div>
        <div tw="flex bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Skip the browser.
        </div>
      </div>

      {/* glass panel pinned to the bottom */}
      <div tw="absolute left-[72px] bottom-16 flex items-center gap-4 rounded-[20px] border border-white/10 bg-white/5 backdrop-blur-lg px-6 py-4 shadow-2xl">
        <div tw="flex text-[40px]">⚡</div>
        <div tw="flex flex-col">
          <div tw={`text-[22px] font-semibold ${tw.text}`}>Chromium's ~300 MB, cut to a few MB of Rust</div>
          <div tw={`text-[15px] ${tw.textMuted}`}>No cold start · Node, Workers, WASM &amp; Rust</div>
        </div>
      </div>
    </div>,
    { ...canvas.og, fonts },
  );

  await writeFile(join(outDir, "hero.png"), png);
  console.log(`✓ hero.png (${png.length.toLocaleString()} bytes)`);
}
