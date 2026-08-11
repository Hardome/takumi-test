import { render } from "takumi-js";
import { googleFonts } from "takumi-js/helpers";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PDFDocument } from "pdf-lib";

import { loadSpec, type Operation, type Spec } from "./loadSpec.js";
import { prettyLines } from "./highlight.js";
import { CoverPage, EndpointPage } from "./render.js";
import { config, BASE_WIDTH } from "../config.js";

const W = config.docs.width;
const k = W / BASE_WIDTH; // wider pages fit more chars per line → fewer wrapped lines
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

/* -------- height estimation (bias to overshoot so nothing ever clips) ------ */

const ceilDiv = (n: number, d: number) => Math.max(1, Math.ceil(n / d));
const codeH = (value: unknown) => 70 + prettyLines(value).length * 26;

function paramTableH(op: Operation): number {
  let h = 42; // header
  for (const p of op.params) {
    const descLines = ceilDiv((p.description ?? "").length, 52 * k);
    const typeLines = ceilDiv(p.type.length, 34);
    h += 26 + Math.max(descLines, typeLines) * 22;
  }
  return h;
}

function endpointHeight(op: Operation): number {
  let h = 48 + 40; // top + bottom padding
  h += 52; // header row
  if (op.summary) h += 24 + 34;
  if (op.description) h += 12 + ceilDiv(op.description.length, 95 * k) * 26;
  if (op.params.length) h += 58 + paramTableH(op);
  if (op.requestExample !== undefined) h += 58 + codeH(op.requestExample);
  h += 58; // responses title
  for (const r of op.responses) {
    h += 30 + 12 + (r.example !== undefined ? codeH(r.example) : 0) + 16;
  }
  h += 32 + 24; // footer
  return Math.max(720, Math.round(h + 40));
}

/* ---------------------------------------------------------------- generate */

async function main() {
  await mkdir(outDir, { recursive: true });
  const spec = loadSpec();
  const fonts = await loadFonts();

  const tagCounts: [string, number][] = spec.tags.map((t) => [
    t.name,
    spec.operations.filter((o) => o.tags.includes(t.name)).length,
  ]);

  const total = spec.operations.length;
  const pages: { file: string; label: string }[] = [];
  const shots: Uint8Array[] = []; // page PNGs, in order, for the combined PDF

  // cover
  const cover = await render(<CoverPage spec={spec} tagCounts={tagCounts} />, {
    width: W,
    height: config.docs.coverHeight,
    fonts,
  });
  await writeFile(join(outDir, "00-cover.png"), cover);
  pages.push({ file: "00-cover.png", label: `${spec.title} v${spec.version}` });
  shots.push(cover);
  console.log(`✓ 00-cover.png (${cover.length.toLocaleString()} bytes)`);

  // one page per operation
  for (let i = 0; i < spec.operations.length; i++) {
    const op = spec.operations[i];
    const height = endpointHeight(op);
    const png = await render(<EndpointPage op={op} index={i + 1} total={total} />, {
      width: W,
      height,
      fonts,
    });
    const file = `${String(i + 1).padStart(2, "0")}-${op.operationId}.png`;
    await writeFile(join(outDir, file), png);
    pages.push({ file, label: `${op.method} ${op.path}` });
    shots.push(png);
    console.log(`✓ ${file} (${height}px, ${png.length.toLocaleString()} bytes)`);
  }

  await writeIndex(spec, pages);
  const pdfName = "api.pdf";
  await writePdf(shots, join(outDir, pdfName));
  console.log(`✓ ${pdfName} (${pages.length} pages)`);
  console.log(`\nDone. ${pages.length} doc pages in ./out/api — open out/api/index.html or out/api/${pdfName}`);
}

/** Stitch the page screenshots into one PDF, each page sized to its image. */
async function writePdf(shots: Uint8Array[], dest: string) {
  const pdf = await PDFDocument.create();
  for (const shot of shots) {
    const img = await pdf.embedPng(shot);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  await writeFile(dest, await pdf.save());
}

async function writeIndex(spec: Spec, pages: { file: string; label: string }[]) {
  const items = pages
    .map(
      (p) => `    <figure>
      <figcaption>${p.label}</figcaption>
      <img src="./${p.file}" alt="${p.label}" />
    </figure>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${spec.title} — API reference</title>
  <style>
    body { margin: 0; background: #070a10; color: #e5e7eb;
           font: 15px/1.5 system-ui, sans-serif; padding: 40px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    p.sub { color: #9ca3af; margin: 0 0 28px; }
    figure { margin: 0 0 28px; max-width: 1240px; }
    figcaption { color: #9ca3af; font-family: ui-monospace, monospace; margin-bottom: 8px; }
    img { width: 100%; border-radius: 14px; border: 1px solid #1f2937; display: block; }
  </style>
</head>
<body>
  <h1>${spec.title} <span style="color:#6b7280">v${spec.version}</span></h1>
  <p class="sub">${pages.length} pages · rendered from openapi.yaml by Takumi</p>
${items}
</body>
</html>
`;
  await writeFile(join(outDir, "index.html"), html);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
