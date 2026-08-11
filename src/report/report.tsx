import { prettyLines } from "../openapi/highlight.js";
import type { ParamRow, ReportModel, Service } from "./model.js";

/**
 * Light-theme report components, authored to A4 content width so takumi-pdf can
 * flow a service across as many A4 pages as it needs. No fixed canvas: no
 * `h-full`, no per-page footer (the repeating band comes from takumi-pdf).
 */

const MONO = "font-['JetBrains_Mono']";
const GRID = "border-[#cbd5e1]";

interface Col {
  key: keyof ParamRow;
  label: string;
  w?: number; // fixed px width; omit for the flexible last column
  mono?: boolean;
}

// Narrow, A4-friendly columns (~478px fixed + flexible "Описание").
const paramCols: Col[] = [
  { key: "name", label: "Параметр", w: 96, mono: true },
  { key: "format", label: "Формат", w: 84 },
  { key: "multiplicity", label: "Крат.", w: 52 },
  { key: "length", label: "Символов", w: 66 },
  { key: "pattern", label: "Паттерн", w: 78 },
  { key: "example", label: "Пример", w: 96 },
  { key: "description", label: "Описание" },
];

function cellWidth(c: { w?: number }): string {
  return c.w ? `w-[${c.w}px]` : "flex-1";
}

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-5`}>
      <div tw="flex bg-[#f1f5f9]">
        {paramCols.map((c) => (
          <div key={c.key} tw={`flex ${cellWidth(c)} border-r border-b ${GRID} px-2 py-1.5 text-[10px] font-semibold text-[#334155]`}>
            {c.label}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} tw="flex">
          {paramCols.map((c) => (
            <div
              key={c.key}
              tw={`flex ${cellWidth(c)} border-r border-b ${GRID} px-2 py-1.5 text-[11px] leading-[16px] break-all ${c.mono ? `${MONO} text-[10px] text-[#0f172a]` : "text-[#334155]"}`}
            >
              {row[c.key] || "—"}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CodesTable({ codes }: { codes: [string, string][] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-5`}>
      <div tw="flex bg-[#f1f5f9]">
        <div tw={`flex w-[96px] border-r border-b ${GRID} px-2 py-1.5 text-[10px] font-semibold text-[#334155]`}>Код</div>
        <div tw={`flex flex-1 border-r border-b ${GRID} px-2 py-1.5 text-[10px] font-semibold text-[#334155]`}>Описание</div>
      </div>
      {codes.map(([code, text], i) => (
        <div key={i} tw="flex">
          <div tw={`flex w-[96px] border-r border-b ${GRID} px-2 py-1.5 text-[11px] ${MONO} text-[#0f172a]`}>{code}</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-2 py-1.5 text-[11px] text-[#334155]`}>{text}</div>
        </div>
      ))}
    </div>
  );
}

function Pre({ value }: { value: unknown }) {
  const lines = value === undefined ? ["—"] : prettyLines(value);
  return (
    <div tw="flex flex-col rounded border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-2">
      {lines.map((l, i) => (
        <div key={i} tw={`flex ${MONO} text-[11px] leading-[17px] whitespace-pre text-[#0f172a]`}>{l || " "}</div>
      ))}
    </div>
  );
}

function IntroTable({ service }: { service: Service }) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div tw="flex">
      <div tw={`flex w-[150px] border-r border-b ${GRID} px-2.5 py-1.5 bg-[#f8fafc] text-[12px] font-semibold text-[#334155]`}>{label}</div>
      <div tw={`flex flex-1 border-r border-b ${GRID} px-2.5 py-1.5 text-[12px] text-[#334155]`}>{children}</div>
    </div>
  );
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-5`}>
      <Row label="Сервис">
        <span tw={`flex ${MONO} text-[12px] text-[#0f172a]`}>{service.serviceName}</span>
      </Row>
      <Row label="Наименование">{service.summary || "—"}</Row>
      <Row label="Описание">{service.description || "—"}</Row>
      <Row label="Пример запроса">
        <Pre value={service.inParamsExample} />
      </Row>
      <Row label="Пример ответа">
        <Pre value={service.outExample} />
      </Row>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <div tw="flex text-[21px] font-bold text-[#0f172a] mb-3">{children}</div>;
}
function H4({ children }: { children: React.ReactNode }) {
  return <div tw="flex text-[15px] font-bold text-[#0f172a] mb-2 mt-1">{children}</div>;
}

/* --------------------------------------------------------------- full pages */

export function ServicePage({ service }: { service: Service }) {
  return (
    <div tw="flex flex-col w-full font-[Inter] text-[#0f172a]">
      <div tw={`flex items-center justify-between mb-3 pb-2 border-b ${GRID}`}>
        <div tw={`flex ${MONO} text-[14px] text-[#475569]`}>{service.serviceName}</div>
        <div tw="flex text-[12px] text-[#94a3b8]">Отчёт по API</div>
      </div>

      <H2>Описание API</H2>
      <IntroTable service={service} />

      {service.query.length > 0 && (
        <>
          <H4>Query параметры</H4>
          <ParamTable rows={service.query} />
        </>
      )}
      {service.path.length > 0 && (
        <>
          <H4>Path параметры</H4>
          <ParamTable rows={service.path} />
        </>
      )}
      {service.headers.length > 0 && (
        <>
          <H4>Request Headers</H4>
          <ParamTable rows={service.headers} />
        </>
      )}
      {service.body.length > 0 && (
        <>
          <H4>Request Body</H4>
          <ParamTable rows={service.body} />
        </>
      )}

      <H4>Response</H4>
      {service.response.length > 0 ? <ParamTable rows={service.response} /> : <Pre value={service.outExample} />}

      <H4>HTTP Коды</H4>
      <CodesTable codes={service.codes} />
    </div>
  );
}

export function TitlePage({ model }: { model: ReportModel }) {
  return (
    <div tw="flex flex-col w-full font-[Inter] text-[#0f172a]">
      <div tw="flex text-[12px] tracking-[3px] uppercase text-[#64748b]">Отчёт по API · OpenAPI</div>
      <div tw="flex text-[42px] font-bold text-[#0f172a] mt-2">{model.title}</div>
      <div tw="flex text-[16px] text-[#64748b] mt-1">Версия {model.version}</div>
      <div tw="flex text-[14px] leading-[22px] text-[#334155] mt-4">{model.description}</div>

      <div tw="flex text-[12px] font-bold tracking-[1.5px] text-[#64748b] mt-7 mb-2">СОДЕРЖАНИЕ</div>
      <div tw={`flex flex-col border-t border-l ${GRID}`}>
        <div tw="flex bg-[#f1f5f9]">
          <div tw={`flex w-[56px] border-r border-b ${GRID} px-2.5 py-1.5 text-[11px] font-semibold text-[#334155]`}>№</div>
          <div tw={`flex w-[220px] border-r border-b ${GRID} px-2.5 py-1.5 text-[11px] font-semibold text-[#334155]`}>Сервис</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-2.5 py-1.5 text-[11px] font-semibold text-[#334155]`}>Наименование</div>
        </div>
        {model.services.map((s, i) => (
          <div key={i} tw="flex">
            <div tw={`flex w-[56px] border-r border-b ${GRID} px-2.5 py-1.5 text-[12px] text-[#334155]`}>{i + 1}</div>
            <div tw={`flex w-[220px] border-r border-b ${GRID} px-2.5 py-1.5 text-[11px] break-all ${MONO} text-[#0f172a]`}>{s.serviceName}</div>
            <div tw={`flex flex-1 border-r border-b ${GRID} px-2.5 py-1.5 text-[12px] text-[#334155]`}>{s.summary || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
