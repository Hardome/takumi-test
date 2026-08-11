import { render as renderPdf } from "takumi-pdf";
import { googleFonts } from "takumi-js/helpers";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadSpec, type Spec } from "./loadSpec.js";
import { CoverPage, EndpointPage } from "./render.js";
import { A4, pageMargin } from "../config.js";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "out", "api");

/** Load Inter + JetBrains Mono, with a graceful fallback if offline. */
async function loadFonts() {
  try {
    const fonts = await googleFonts([
      { name: "Inter", weight: "400..700" },
      { name: "JetBrains Mono", weight: "400..700" },
    ]);
    console.log("✓ loaded Inter + JetBrains Mono");
    return fonts;
  } catch (err) {
    console.warn(`! font fetch failed, using built-in font (${(err as Error).message})`);
    return undefined;
  }
}

/** Repeating running header: product name + API kind, with a hairline rule. */
function Header({ spec }: { spec: Spec }) {
  return (
    <div tw="flex w-full items-end justify-between font-[Inter] text-[9px] tracking-[1px] uppercase text-[#94a3b8] border-b border-[#e5e7eb] pb-2">
      <div tw="flex">{spec.title}</div>
      <div tw="flex">API Reference · v{spec.version}</div>
    </div>
  );
}

/** Repeating footer band: source note on the left, page counter on the right. */
function Footer({ spec }: { spec: Spec }) {
  return (
    <div tw="flex w-full items-center justify-between font-[Inter] text-[10px] text-[#9ca3af] border-t border-[#e5e7eb] pt-2.5">
      <div tw="flex">{spec.title} · OpenAPI 3.1</div>
      <div tw="flex">
        Page <span className="pageNumber" />&nbsp;/&nbsp;<span className="totalPages" />
      </div>
    </div>
  );
}

/** Count PDF pages from the page tree for a friendly log line. */
function pageCount(pdf: Uint8Array): string {
  const s = Buffer.from(pdf).toString("latin1");
  const m = s.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/);
  return m ? m[1] : "?";
}

/* ---------------------------------------------------------------- generate */

async function main() {
  await mkdir(outDir, { recursive: true });
  // PDF-only output: drop any PNGs / index.html left by earlier runs.
  for (const f of await readdir(outDir)) {
    if (/\.(png|html)$/i.test(f)) await rm(join(outDir, f));
  }
  const spec = loadSpec();
  const fonts = await loadFonts();
  // takumi-pdf embeds real glyphs, so an emoji like 🔒 needs a font that has it.
  const emoji = await googleFonts(["Noto Emoji"]).catch(() => []);

  const tagCounts: [string, number][] = spec.tags.map((t) => [
    t.name,
    spec.operations.filter((o) => o.tags.includes(t.name)).length,
  ]);
  const total = spec.operations.length;

  // One flowing A4 document: cover first, then each endpoint on a fresh page.
  // Endpoints taller than a page flow onto the next A4 sheet — nothing clips.
  const doc = (
    <div tw="flex flex-col font-[Inter] bg-white">
      <CoverPage spec={spec} tagCounts={tagCounts} />
      {spec.operations.map((op, i) => (
        <div key={i} tw="flex w-full" style={{ breakBefore: "page" }}>
          <EndpointPage op={op} />
        </div>
      ))}
    </div>
  );

  const pdf = await renderPdf(doc, {
    size: "a4",
    margin: pageMargin,
    header: <Header spec={spec} />,
    footer: <Footer spec={spec} />,
    fonts: [...(fonts ?? []), ...emoji],
  });

  const pdfName = "api.pdf";
  await writeFile(join(outDir, pdfName), pdf);
  console.log(`✓ ${pdfName} (${pageCount(pdf)} A4 pages, ${(pdf.length / 1024).toFixed(0)} KB)`);
  console.log(`\nDone. ${total} endpoints → ./out/api/${pdfName} (A4 ${A4.width}×${A4.height}px @96dpi)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
