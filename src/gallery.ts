import { readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const outDir = join(__dirname, "..", "out");

/** Scan ./out and (re)write a static gallery that shows every rendered asset. */
export async function buildGallery() {
  const files = (await readdir(outDir))
    .filter((f) => /\.(png|webp|svg)$/i.test(f))
    .sort();

  const cards = files
    .map((f) => {
      const ext = f.split(".").pop()!.toUpperCase();
      return `    <figure>
      <img src="./${f}" alt="${f}" />
      <figcaption><span class="tag">${ext}</span> ${f}</figcaption>
    </figure>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Takumi output gallery</title>
  <style>
    body { margin: 0; background: #0b0f17; color: #e5e7eb;
           font: 15px/1.5 system-ui, sans-serif; padding: 40px; }
    h1 { font-size: 22px; margin: 0 0 24px; }
    .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
    figure { margin: 0; }
    img { width: 100%; border-radius: 12px; border: 1px solid #1f2937; display: block; background: #111827; }
    figcaption { color: #9ca3af; margin-top: 8px; display: flex; align-items: center; gap: 8px; }
    .tag { font-size: 11px; font-weight: 700; letter-spacing: .5px; color: #c7d2fe;
           background: #312e81; padding: 2px 8px; border-radius: 999px; }
  </style>
</head>
<body>
  <h1>Takumi output — ${files.length} assets</h1>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;
  await writeFile(join(outDir, "index.html"), html);
  return files;
}
