import { render } from "takumi-js";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { canvas } from "./tokens.js";
import { customers, paginate } from "./data.js";
import { PageShell, Table, Pagination } from "./components.js";
import { loadFonts } from "./fonts.js";
import { outDir, buildGallery } from "./gallery.js";

const PAGE_SIZE = 5;

async function main() {
  await mkdir(outDir, { recursive: true });
  const fonts = await loadFonts();

  const pages = paginate(customers, PAGE_SIZE);
  const totalPages = pages.length;
  const files: string[] = [];

  for (let i = 0; i < totalPages; i++) {
    const page = i + 1;
    const rows = pages[i];
    const rangeStart = i * PAGE_SIZE + 1;
    const rangeEnd = rangeStart + rows.length - 1;

    const png = await render(
      <PageShell title="Customer Ledger" subtitle="Monthly recurring revenue by account">
        <Table rows={rows} />
        <Pagination
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={customers.length}
        />
      </PageShell>,
      { ...canvas.og, fonts },
    );

    const name = `page-${page}.png`;
    await writeFile(join(outDir, name), png);
    files.push(name);
    console.log(`✓ ${name}  (${rows.length} rows, ${png.length.toLocaleString()} bytes)`);
  }

  await buildGallery();
  console.log(`\nDone. ${files.length} images in ./out — open out/index.html to view.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
