import { render as renderPdf } from "takumi-pdf";
import { googleFonts, fontFromUrl } from "takumi-js/helpers";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

import { loadReportModel, type ReportModel } from "./model.js";
import { ServicePage, TitlePage } from "./report.js";
import { A4, pageMargin } from "../config.js";

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
    return [fontFromUrl('https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf')];
  } catch (err) {
    console.warn(`! font fetch failed, using built-in font (${(err as Error).message})`);
    return undefined;
  }
}

/** Repeating running header: product name + report kind, with a hairline rule. */
function Header({ model }: { model: ReportModel }) {
  return (
    <div tw="flex w-full items-end justify-between font-[Inter] text-[9px] tracking-[1px] uppercase text-[#94a3b8] border-b border-[#e2e8f0] pb-2">
      <div tw="flex">{model.title}</div>
      <div tw="flex">Отчёт по API · v{model.version}</div>
    </div>
  );
}

/** Repeating footer band: source note on the left, page counter on the right. */
function Footer({ model }: { model: ReportModel }) {
  return (
    <div tw="flex w-full items-center justify-between font-[Inter] text-[10px] text-[#94a3b8] border-t border-[#e2e8f0] pt-2.5">
      <div tw="flex">{model.title} · Отчёт по API</div>
      <div tw="flex">
        Страница <span className="pageNumber" />&nbsp;из&nbsp;<span className="totalPages" />
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
  const model = loadReportModel(specPath);
  const fonts = await loadFonts();
  const emoji = await googleFonts(["Noto Emoji"]).catch(() => []);
  console.log(`spec: ${specPath}\nout:  ${outDir}`);

  // One flowing A4 document: title page first, then each service on a fresh page.
  // A service taller than one page flows onto the next A4 sheet — nothing clips.
  const doc = (
    <div tw="flex flex-col font-[Inter] bg-white">
      <TitlePage model={model} />
      {model.services.map((s, i) => (
        <div key={i} tw="flex w-full" style={{ breakBefore: "page" }}>
          <ServicePage service={s} />
        </div>
      ))}
    </div>
  );

  const pdf = await renderPdf(doc, {
    size: "a4",
    margin: pageMargin,
    header: <Header model={model} />,
    footer: <Footer model={model} />,
    fonts: [...(fonts ?? []), ...emoji],
  });

  const pdfName = `${specName || "aperture"}.pdf`;
  await writeFile(join(outDir, pdfName), pdf);
  const rel = outDir.slice(root.length + 1).replace(/\\/g, "/");
  console.log(`✓ ${pdfName} (${pageCount(pdf)} A4 pages, ${(pdf.length / 1024).toFixed(0)} KB)`);
  console.log(`\nDone. ${model.services.length} services → ./${rel}/${pdfName} (A4 ${A4.width}×${A4.height}px @96dpi)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
