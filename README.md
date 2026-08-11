# takumi-demo

Render JSX to images (PNG / SVG / animated WebP) with
[Takumi](https://takumi.kane.tw/) — no headless browser. Styling is done with
Tailwind utilities via the `tw` prop.

## Run it

```bash
npm install
npm run generate   # paginated data tables      → out/page-*.png
npm run examples   # gradient / grid / vector / motion demos → out/{hero,bento,ticket,spinner}.*
npm run docs       # render openapi.yaml to API-reference pages → out/api/*.png
npm run report     # openapi.yaml → light A4 report pages + PDF → out/report/*.png
npm run all        # generate + examples
```

Everything lands in `./out` with an auto-built `out/index.html` gallery.

## Output size

Dimensions live in [`src/config.ts`](src/config.ts) and can be overridden per run:

```bash
OG_WIDTH=1600 OG_HEIGHT=840 npm run all   # larger canvas
DOCS_WIDTH=1600 npm run docs              # wider API-reference pages
REPORT_PAGE=a4 npm run report             # fixed A4 paged report
```

| Env var               | Default | Affects                                  |
| --------------------- | ------- | ---------------------------------------- |
| `OG_WIDTH` / `OG_HEIGHT` | 1200 / 630 | tables + examples canvas             |
| `DOCS_WIDTH`          | 1240    | API-reference page width                 |
| `DOCS_COVER_HEIGHT`   | 940     | API-reference cover height               |
| `REPORT_WIDTH`        | 1240    | report page width                        |
| `REPORT_TITLE_HEIGHT` | 940     | report title-page height                 |
| `REPORT_PAGE`         | —       | `a4`/`letter` → fixed paged mode         |
| `REPORT_PAGE_HEIGHT`  | —       | explicit fixed page height (px)          |

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
