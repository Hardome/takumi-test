/**
 * Example: crisp VECTOR output via renderSvg — Tailwind (`tw`) syntax, same
 * pipeline as render() but emits real SVG (paths, gradients, glyph outlines) so
 * it scales without blurring. An event ticket with a perforated stub.
 */
import { renderSvg } from "takumi-js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { tw } from "../tokens.js";
import { loadFonts } from "../fonts.js";
import { outDir } from "../gallery.js";

export async function vector() {
  const fonts = await loadFonts();

  const svg = await renderSvg(
    <div tw="flex w-full h-full font-[Inter] p-7 bg-[linear-gradient(120deg,#4f46e5_0%,#7c3aed_50%,#db2777_100%)]">
      <div tw="flex w-full h-full rounded-[20px] overflow-hidden bg-[#0b0f17]">
        {/* main body */}
        <div tw="flex flex-col grow p-10 justify-between">
          <div tw="flex flex-col">
            <div tw="text-lg font-semibold tracking-[3px] text-[#a5b4fc]">ADMIT ONE</div>
            <div tw={`text-[56px] font-bold mt-2.5 ${tw.text}`}>Render Conf ’26</div>
            <div tw={`text-[22px] mt-1.5 ${tw.textMuted}`}>Rust + JSX rendering track</div>
          </div>
          <div tw="flex gap-10">
            {[["DATE", "Sep 24"], ["GATE", "B7"], ["SEAT", "R12 · 118"]].map(([k, v]) => (
              <div key={k} tw="flex flex-col">
                <div tw={`text-[15px] tracking-[2px] ${tw.textFaint}`}>{k}</div>
                <div tw={`text-[22px] font-semibold ${tw.text}`}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* perforated stub with a fake barcode */}
        <div tw={`flex flex-col items-center justify-center gap-4 w-[220px] border-l-[3px] border-dashed bg-[#0e1420] ${tw.border}`}>
          <div tw="flex gap-[3px]">
            {[3, 6, 2, 5, 2, 7, 3, 4, 2, 6, 3, 5, 2, 4].map((w, i) => (
              <div key={i} tw={`h-24 w-[${w}px] ${i % 2 ? "bg-[#e5e7eb]" : "bg-[#374151]"}`} />
            ))}
          </div>
          <div tw={`text-[15px] tracking-[3px] ${tw.textMuted}`}>TAKUMI-2026</div>
        </div>
      </div>
    </div>,
    { width: 1000, height: 420, fonts },
  );

  await writeFile(join(outDir, "ticket.svg"), svg);
  console.log(`✓ ticket.svg (${svg.length.toLocaleString()} chars, vector)`);
}
