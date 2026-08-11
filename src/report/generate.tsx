import { render } from "takumi-js";
import { googleFonts } from "takumi-js/helpers";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

import { PDFDocument } from "pdf-lib";

import { loadReportModel, type ParamRow, type Service, type ReportModel } from "./model.js";
import { prettyLines } from "../openapi/highlight.js";
import { ServicePage, TitlePage } from "./report.js";
import { buildDocumentPages, PagedShell, type Geom } from "./paged.js";
import { config } from "../config.js";

const W = config.report.width;
// Fixed table columns sum ~840px + ~96px padding; the rest is the wrapping
// "Описание" column, so chars-per-line scales with the configured width.
const DESC_CHARS = Math.max(18, Math.round((W - 936) / 8));

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Optional spec path arg: `tsx src/report/generate.tsx <spec.yaml>`. With no arg
// it uses the repo's openapi.yaml and writes to out/report (backwards compatible);
// with an arg it namespaces output under out/report/<spec-name>/.
const specArg = process.argv[2];
const specPath = specArg ? resolve(specArg) : join(root, "openapi.yaml");
const specName = specArg ? basename(specPath).replace(/\.(ya?ml|json)$/i, "") : "";
const outDir = specName ? join(root, "out", "report", specName) : join(root, "out", "report");

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

function rowsH(rows: ParamRow[]): number {
  let h = 42; // header
  for (const r of rows) {
    // description wraps in the flexible column; name/example are fixed-width columns
    const lines = Math.max(ceilDiv(r.description.length, DESC_CHARS), ceilDiv(r.example.length, 20), ceilDiv(r.name.length, 26), 1);
    h += 22 + lines * 22;
  }
  return h;
}

function serviceHeight(s: Service): number {
  let h = 40 + 32; // page padding
  h += 40; // top service label row
  h += 44; // H2
  // intro: 3 text rows + 2 pre rows
  h += 3 * 42;
  h += 28 + prettyLines(s.inParamsExample ?? "—").length * 20;
  h += 28 + prettyLines(s.outExample ?? "—").length * 20;
  h += 24; // intro margin

  const section = (rows: ParamRow[]) => 44 + rowsH(rows) + 12;
  if (s.query.length) h += section(s.query);
  if (s.path.length) h += section(s.path);
  if (s.headers.length) h += section(s.headers);
  if (s.body.length) h += section(s.body);
  h += 44 + (s.response.length ? rowsH(s.response) : prettyLines(s.outExample ?? "—").length * 20 + 24) + 12; // response
  h += 44 + 42 + s.codes.length * 34 + 12; // http codes
  h += 40; // footer
  return Math.max(760, Math.round(h + 48));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------------------------------------------------------------- generate */

async function main() {
  await mkdir(outDir, { recursive: true });
  // clear prior artifacts so switching modes doesn't leave stragglers
  for (const f of await readdir(outDir)) {
    if (/\.(png|pdf|html)$/i.test(f)) await rm(join(outDir, f));
  }
  const model = loadReportModel(specPath);
  const fonts = await loadFonts();
  console.log(`spec: ${specPath}\nout:  ${outDir}`);

  const pages: { file: string; label: string }[] = [];
  const shots: Uint8Array[] = []; // page PNGs, in order, for the combined PDF

  if (config.report.pageHeight > 0) {
    await renderPaged(model, fonts, pages, shots);
  } else {
    await renderPerService(model, fonts, pages, shots);
  }

  await writeIndex(model.title, model.version, pages);
  const pdfName = `${specName || "aperture"}.pdf`;
  await writePdf(shots, join(outDir, pdfName));

  const rel = outDir.slice(root.length + 1).replace(/\\/g, "/");
  console.log(`✓ ${pdfName} (${pages.length} pages)`);
  console.log(`\nDone. ${pages.length} report pages in ./${rel} — open ${rel}/index.html or ${rel}/${pdfName}`);
}

type Pg = { file: string; label: string };

/** Default: one content-height page per service (+ an adaptive title page). */
async function renderPerService(model: ReportModel, fonts: Awaited<ReturnType<typeof loadFonts>>, pages: Pg[], shots: Uint8Array[]) {
  const total = model.services.length + 1;
  const titleHeight = Math.max(config.report.titleHeight, 320 + model.services.length * 40);
  const title = await render(<TitlePage model={model} total={total} />, { width: W, height: titleHeight, fonts });
  await writeFile(join(outDir, "00-title.png"), title);
  pages.push({ file: "00-title.png", label: `${model.title} v${model.version}` });
  shots.push(title);
  console.log(`✓ 00-title.png (${title.length.toLocaleString()} bytes)`);

  for (let i = 0; i < model.services.length; i++) {
    const s = model.services[i];
    const height = serviceHeight(s);
    const png = await render(<ServicePage service={s} page={i + 2} total={total} />, { width: W, height, fonts });
    const file = `${String(i + 1).padStart(2, "0")}-${slug(s.serviceName)}.png`;
    await writeFile(join(outDir, file), png);
    pages.push({ file, label: s.serviceName });
    shots.push(png);
    console.log(`✓ ${file} (${height}px, ${png.length.toLocaleString()} bytes)`);
  }
}

/** Paged: flow the whole report across fixed-height (e.g. A4) pages. */
async function renderPaged(model: ReportModel, fonts: Awaited<ReturnType<typeof loadFonts>>, pages: Pg[], shots: Uint8Array[]) {
  const H = config.report.pageHeight;
  const geom: Geom = { W, H, budget: H - 176, descCaps: DESC_CHARS };
  const docPages = buildDocumentPages(model, geom);
  const total = docPages.length;
  console.log(`paged: ${W}x${H}px, ${total} pages`);

  for (let i = 0; i < docPages.length; i++) {
    const p = docPages[i];
    const png = await render(
      <PagedShell label={p.label} page={i + 1} total={total}>
        {p.children}
      </PagedShell>,
      { width: W, height: H, fonts },
    );
    const file = `page-${String(i + 1).padStart(3, "0")}.png`;
    await writeFile(join(outDir, file), png);
    pages.push({ file, label: `${p.label} · ${i + 1}/${total}` });
    shots.push(png);
    console.log(`✓ ${file}`);
  }
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

async function writeIndex(title: string, version: string, pages: { file: string; label: string }[]) {
  const items = pages
    .map(
      (p) => `    <figure>
      <figcaption>${p.label}</figcaption>
      <img src="./${p.file}" alt="${p.label}" />
    </figure>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — отчёт по API</title>
  <style>
    body { margin: 0; background: #e5e7eb; color: #111827;
           font: 15px/1.5 system-ui, sans-serif; padding: 40px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    p.sub { color: #6b7280; margin: 0 0 28px; }
    figure { margin: 0 0 28px; max-width: 1240px; }
    figcaption { color: #6b7280; font-family: ui-monospace, monospace; margin-bottom: 8px; }
    img { width: 100%; border-radius: 6px; border: 1px solid #bbbbbb; display: block; box-shadow: 0 4px 16px rgba(0,0,0,.12); }
  </style>
</head>
<body>
  <h1>${title} <span style="color:#9ca3af">v${version}</span></h1>
  <p class="sub">Отчёт по API · ${pages.length} страниц · сгенерировано Takumi из openapi.yaml</p>
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
