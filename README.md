# takumi-demo

Render JSX to images (PNG / SVG / animated WebP) with
[Takumi](https://takumi.kane.tw/) — no headless browser. Styling is done with
Tailwind utilities via the `tw` prop.

## Run it

```bash
npm install
npm run generate   # paginated data tables      → out/page-*.png
npm run examples   # gradient / grid / vector / motion demos → out/{hero,bento,ticket,spinner}.*
npm run docs       # openapi.yaml → API-reference vector PDF → out/api/api.pdf
npm run report     # openapi.yaml → light A4 report vector PDF → out/report/*.pdf
npm run all        # generate + examples
```

Everything lands in `./out` with an auto-built `out/index.html` gallery.

## Output size

`docs` and `report` emit **physical A4 PDFs** (595×842pt / 210×297mm): content is
authored to the A4 content width and [takumi-pdf](https://www.npmjs.com/package/takumi-pdf)
flows it across as many A4 sheets as it needs, with a repeating page-number
footer. Sizes live in [`src/config.ts`](src/config.ts) and can be overridden per run:

```bash
OG_WIDTH=1600 OG_HEIGHT=840 npm run all   # larger image canvas
PAGE_MARGIN_X=32 npm run report           # tighter left/right page margins
```

| Env var                                  | Default    | Affects                              |
| ---------------------------------------- | ---------- | ------------------------------------ |
| `OG_WIDTH` / `OG_HEIGHT`                 | 1200 / 630 | tables + examples image canvas       |
| `PAGE_MARGIN_X`                          | 44         | A4 left/right margin (px @96dpi)     |
| `PAGE_MARGIN_TOP` / `PAGE_MARGIN_BOTTOM` | 56 / 52    | A4 top/bottom margin (header/footer) |

`npm run report -- <spec.yaml>` renders any OpenAPI file, namespacing output
under `out/report/<name>/`.

## How it works

`render()` from `takumi-js` takes a JSX tree and returns PNG bytes — a Rust
engine does layout, text, and rasterization with no browser and no cold start.
`renderSvg()` emits vector output and `renderAnimation()` emits animated WebP
from CSS `@keyframes`.

```tsx
import { render } from "takumi-js";

const png = await render(
  <div tw="flex h-full w-full items-center justify-center bg-[#0b0f17] text-white">
    Hello Takumi
  </div>,
  { width: 1200, height: 630 },
);
```
