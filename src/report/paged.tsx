import type { ReactNode } from "react";
import { prettyLines } from "../openapi/highlight.js";
import type { ParamRow, ReportModel } from "./model.js";

/**
 * Paged mode: flows a report across FIXED-height pages (e.g. A4) instead of one
 * tall page per service. Content is broken into items (section titles, table
 * rows, code blocks), each with an estimated height, then greedily packed into
 * pages of a fixed height. Table column headers repeat on continuation pages,
 * and every service starts on a fresh page (like api-reports' page-break).
 */

const MONO = "font-['JetBrains_Mono']";
const GRID = "border-[#bbbbbb]";

export interface Geom {
  W: number;
  H: number;
  budget: number; // usable content height per page
  descCaps: number; // chars-per-line in the flexible "Описание" column
}

interface Col {
  label: string;
  w?: number; // fixed px; omitted = flexible
  mono?: boolean;
}

const paramCols: Col[] = [
  { label: "Параметр", w: 200, mono: true },
  { label: "Формат данных", w: 150 },
  { label: "Кратность", w: 92 },
  { label: "Кол-во символов", w: 118 },
  { label: "Паттерн", w: 120 },
  { label: "Пример", w: 160 },
  { label: "Описание" },
];
const codesCols: Col[] = [{ label: "Код", w: 120, mono: true }, { label: "Описание" }];
const tocCols: Col[] = [{ label: "№", w: 80 }, { label: "Сервис", mono: true }, { label: "Наименование" }];

/* --------------------------------------------------------------- item model */

type Table = "param" | "codes" | "toc";

interface IntroCell {
  label: string;
  value?: unknown;
  text?: string;
  pre?: boolean;
  mono?: boolean;
}

interface Item {
  owner: string; // service name or "@title"
  breakBefore?: boolean;
  h: number;
  kind: "titleBlock" | "h2" | "h4" | "introRow" | "row" | "pre";
  tid?: string;
  headerH?: number;
  table?: Table;
  cells?: string[];
  intro?: IntroCell;
  text?: string;
  value?: unknown;
  model?: ReportModel;
}

/* ------------------------------------------------------------ height helpers */

function capsFor(cols: Col[], geom: Geom): number[] {
  return cols.map((c) => (c.w ? Math.max(4, Math.floor(c.w / (c.mono ? 8 : 7.5))) : geom.descCaps));
}
function rowHeight(cells: string[], caps: number[]): number {
  let lines = 1;
  cells.forEach((t, i) => (lines = Math.max(lines, Math.ceil((t?.length || 1) / caps[i]))));
  return 20 + lines * 22;
}
const paramCells = (r: ParamRow): string[] => [r.name, r.format, r.multiplicity, r.length, r.pattern, r.example, r.description];

/* ---------------------------------------------------------------- build items */

function buildItems(model: ReportModel, geom: Geom): Item[] {
  const items: Item[] = [];
  const pcaps = capsFor(paramCols, geom);
  const ccaps = capsFor(codesCols, geom);
  const tcaps = capsFor(tocCols, geom);
  const introCap = Math.max(20, Math.floor((geom.W - 296) / 8));
  const wideCap = Math.max(40, Math.floor((geom.W - 96) / 8));

  // title block + table of contents
  const descLines = Math.ceil((model.description.length || 1) / wideCap);
  items.push({ owner: "@title", kind: "titleBlock", model, h: 150 + descLines * 26 });
  model.services.forEach((s, i) => {
    const cells = [String(i + 1), s.serviceName, s.summary || "—"];
    items.push({ owner: "@title", kind: "row", tid: "toc", table: "toc", headerH: 44, cells, h: rowHeight(cells, tcaps) });
  });

  model.services.forEach((s, si) => {
    let first = true;
    const add = (o: Omit<Item, "owner">) => {
      const it = o as Item;
      it.owner = s.serviceName;
      if (first) {
        it.breakBefore = true;
        first = false;
      }
      items.push(it);
    };
    const tid = (t: string) => `${si}-${t}`;

    add({ kind: "h2", text: "Описание API", h: 52 });
    add({ kind: "introRow", intro: { label: "Сервис", text: s.serviceName, mono: true }, h: 46 });
    add({ kind: "introRow", intro: { label: "Наименование", text: s.summary || "—" }, h: 18 + Math.ceil((s.summary || "—").length / introCap) * 22 });
    add({ kind: "introRow", intro: { label: "Описание", text: s.description || "—" }, h: 18 + Math.max(1, Math.ceil((s.description || "—").length / introCap)) * 22 });
    const reqLines = prettyLines(s.inParamsExample ?? "—").length;
    add({ kind: "introRow", intro: { label: "Пример запроса", value: s.inParamsExample, pre: true }, h: 28 + reqLines * 20 + 16 });
    const resLines = prettyLines(s.outExample ?? "—").length;
    add({ kind: "introRow", intro: { label: "Пример ответа", value: s.outExample, pre: true }, h: 28 + resLines * 20 + 16 });

    const sections: [string, ParamRow[], string][] = [
      ["Query параметры", s.query, "q"],
      ["Path параметры", s.path, "p"],
      ["Request Headers", s.headers, "hd"],
      ["Request Body", s.body, "bd"],
    ];
    for (const [title, rows, t] of sections) {
      if (!rows.length) continue;
      add({ kind: "h4", text: title, h: 48 });
      for (const r of rows) {
        const cells = paramCells(r);
        add({ kind: "row", tid: tid(t), table: "param", headerH: 58, cells, h: rowHeight(cells, pcaps) });
      }
    }

    add({ kind: "h4", text: "Response", h: 48 });
    if (s.response.length) {
      for (const r of s.response) {
        const cells = paramCells(r);
        add({ kind: "row", tid: tid("rs"), table: "param", headerH: 58, cells, h: rowHeight(cells, pcaps) });
      }
    } else {
      add({ kind: "pre", value: s.outExample, h: 28 + resLines * 20 + 16 });
    }

    add({ kind: "h4", text: "HTTP Коды", h: 48 });
    for (const c of s.codes) {
      const cells = [c[0], c[1]];
      add({ kind: "row", tid: tid("cd"), table: "codes", headerH: 42, cells, h: rowHeight(cells, ccaps) });
    }
  });

  return items;
}

/* ------------------------------------------------------------------ paginate */

function paginate(items: Item[], geom: Geom): Item[][] {
  const B = geom.budget;
  const pages: Item[][] = [];
  let cur: Item[] = [];
  let used = 0;
  const counted = new Set<string>();
  const flush = () => {
    if (cur.length) pages.push(cur);
    cur = [];
    used = 0;
    counted.clear();
  };

  for (let i = 0; i < items.length; i++) {
    const el = items[i];
    if (el.breakBefore && cur.length) flush();

    if (el.kind === "row") {
      const needHeader = !counted.has(el.tid!) ? el.headerH! : 0;
      if (cur.length && used + el.h + needHeader > B) flush();
      if (!counted.has(el.tid!)) {
        counted.add(el.tid!);
        used += el.headerH!;
      }
      cur.push(el);
      used += el.h;
    } else if (el.kind === "h4") {
      // keep the heading with at least its table header + first row
      const nx = items[i + 1];
      const need = el.h + (nx && nx.kind === "row" ? nx.headerH! + nx.h : 0);
      if (cur.length && used + need > B) flush();
      cur.push(el);
      used += el.h;
    } else {
      if (cur.length && used + el.h > B) flush();
      cur.push(el);
      used += el.h;
    }
  }
  flush();
  return pages;
}

/* -------------------------------------------------------------- components */

const widthClass = (c: Col) => (c.w ? `w-[${c.w}px]` : "flex-1");

function TableSeg({ cols, rows, continued }: { cols: Col[]; rows: string[][]; continued: boolean }) {
  return (
    <div tw="flex flex-col mb-6">
      {continued && <div tw="flex text-[12px] text-[#9ca3af] mb-1">(продолжение)</div>}
      <div tw={`flex flex-col border-t border-l ${GRID}`}>
        <div tw="flex bg-[#f5f5f5]">
          {cols.map((c, i) => (
            <div key={i} tw={`flex ${widthClass(c)} border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>
              {c.label}
            </div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={ri} tw="flex">
            {cols.map((c, ci) => (
              <div
                key={ci}
                tw={`flex ${widthClass(c)} border-r border-b ${GRID} px-3 py-2 break-all ${c.mono ? `${MONO} text-[13px] text-[#0f172a]` : "text-[14px] text-[#334155]"}`}
              >
                {r[ci] || "—"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Pre({ value }: { value: unknown }) {
  const lines = value === undefined ? ["—"] : prettyLines(value);
  return (
    <div tw="flex flex-col rounded border border-[#e0e0e0] bg-[#f4f7fa] px-3 py-2">
      {lines.map((l, i) => (
        <div key={i} tw={`flex ${MONO} text-[13px] leading-[20px] whitespace-pre text-[#0f172a]`}>{l || " "}</div>
      ))}
    </div>
  );
}

function IntroKV({ rows }: { rows: IntroCell[] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-6`}>
      {rows.map((r, i) => (
        <div key={i} tw="flex">
          <div tw={`flex w-[200px] border-r border-b ${GRID} px-3 py-2 bg-[#fafafa] text-[14px] font-semibold text-[#111827]`}>{r.label}</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[14px] text-[#334155]`}>
            {r.pre ? <Pre value={r.value} /> : r.mono ? <span tw={`flex ${MONO} text-[14px] text-[#0f172a]`}>{r.text}</span> : r.text || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function TitleBlock({ model }: { model: ReportModel }) {
  return (
    <div tw="flex flex-col mb-6">
      <div tw="flex text-[14px] tracking-[3px] uppercase text-[#6b7280]">Отчёт по API · OpenAPI</div>
      <div tw="flex text-[52px] font-bold text-[#111827] mt-2">{model.title}</div>
      <div tw="flex text-[18px] text-[#6b7280] mt-1">Версия {model.version}</div>
      <div tw="flex text-[15px] leading-[24px] text-[#334155] mt-4 pr-10">{model.description}</div>
      <div tw="flex text-[13px] font-bold tracking-[1px] text-[#6b7280] mt-6">СОДЕРЖАНИЕ</div>
    </div>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <div tw="flex text-[24px] font-bold text-[#111827] mb-4 mt-1">{children}</div>;
}
function H4({ children }: { children: ReactNode }) {
  return <div tw="flex text-[17px] font-bold text-[#111827] mb-3 mt-1">{children}</div>;
}

export function PagedShell({ label, page, total, children }: { label: string; page: number; total: number; children: ReactNode }) {
  return (
    <div tw="flex flex-col w-full h-full font-[Inter] bg-white px-12 pt-10 pb-8">
      <div tw="flex items-center justify-between pb-4 mb-4 border-b border-[#e5e7eb]">
        <div tw={`flex ${MONO} text-[15px] text-[#6b7280]`}>{label}</div>
        <div tw="flex text-[13px] text-[#9ca3af]">Отчёт по API</div>
      </div>
      <div tw="flex flex-col grow">{children}</div>
      <div tw="flex items-center justify-between mt-auto pt-4 border-t border-[#e5e7eb] text-[12px] text-[#9ca3af]">
        <div tw="flex">{label}</div>
        <div tw="flex">Страница {page} из {total}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- assemble */

const colsFor = (t?: Table) => (t === "toc" ? tocCols : t === "codes" ? codesCols : paramCols);

function renderPage(page: Item[], seen: Set<string>): { owner: string; children: ReactNode[] } {
  const children: ReactNode[] = [];
  let key = 0;
  let i = 0;
  while (i < page.length) {
    const el = page[i];
    if (el.kind === "row") {
      const tid = el.tid!;
      const rows: string[][] = [];
      while (i < page.length && page[i].kind === "row" && page[i].tid === tid) {
        rows.push(page[i].cells!);
        i++;
      }
      const continued = seen.has(tid);
      seen.add(tid);
      children.push(<TableSeg key={key++} cols={colsFor(el.table)} rows={rows} continued={continued} />);
    } else if (el.kind === "introRow") {
      const rows: IntroCell[] = [];
      while (i < page.length && page[i].kind === "introRow") {
        rows.push(page[i].intro!);
        i++;
      }
      children.push(<IntroKV key={key++} rows={rows} />);
    } else if (el.kind === "titleBlock") {
      children.push(<TitleBlock key={key++} model={el.model!} />);
      i++;
    } else if (el.kind === "h2") {
      children.push(<H2 key={key++}>{el.text}</H2>);
      i++;
    } else if (el.kind === "h4") {
      children.push(<H4 key={key++}>{el.text}</H4>);
      i++;
    } else if (el.kind === "pre") {
      children.push(<Pre key={key++} value={el.value} />);
      i++;
    } else {
      i++;
    }
  }
  return { owner: page[0]?.owner ?? "", children };
}

/** Build the whole report as fixed-height pages. */
export function buildDocumentPages(model: ReportModel, geom: Geom): { label: string; children: ReactNode[] }[] {
  const items = buildItems(model, geom);
  const seen = new Set<string>();
  return paginate(items, geom).map((pi) => {
    const { owner, children } = renderPage(pi, seen);
    return { label: owner === "@title" ? model.title : owner, children };
  });
}
