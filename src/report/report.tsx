import { prettyLines } from "../openapi/highlight.js";
import type { ParamRow, ReportModel, Service } from "./model.js";

/**
 * Light-theme report components, mirroring the api-reports Handlebars templates
 * (intro / query / path / headers / body / response / http-codes) but rendered
 * as JSX with Tailwind for Takumi. White page, gray grid, Segoe-like sans.
 */

const MONO = "font-['JetBrains_Mono']";
const GRID = "border-[#bbbbbb]";

interface Col {
  key: keyof ParamRow;
  label: string;
  w?: number; // fixed px width; omit for the flexible last column
}

const paramCols: Col[] = [
  { key: "name", label: "Параметр", w: 200 },
  { key: "format", label: "Формат данных", w: 150 },
  { key: "multiplicity", label: "Кратность", w: 92 },
  { key: "length", label: "Кол-во символов", w: 118 },
  { key: "pattern", label: "Паттерн", w: 120 },
  { key: "example", label: "Пример", w: 160 },
  { key: "description", label: "Описание" },
];

function cellWidth(c: Col): string {
  return c.w ? `w-[${c.w}px]` : "flex-1";
}

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-6`}>
      <div tw="flex bg-[#f5f5f5]">
        {paramCols.map((c) => (
          <div key={c.key} tw={`flex ${cellWidth(c)} border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>
            {c.label}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} tw="flex">
          {paramCols.map((c) => {
            const isName = c.key === "name";
            return (
              <div
                key={c.key}
                tw={`flex ${cellWidth(c)} border-r border-b ${GRID} px-3 py-2 text-[14px] leading-[20px] break-all ${isName ? `${MONO} text-[13px] text-[#0f172a]` : "text-[#334155]"}`}
              >
                {row[c.key] || "—"}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CodesTable({ codes }: { codes: [string, string][] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-6`}>
      <div tw="flex bg-[#f5f5f5]">
        <div tw={`flex w-[120px] border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>Код</div>
        <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>Описание</div>
      </div>
      {codes.map(([code, text], i) => (
        <div key={i} tw="flex">
          <div tw={`flex w-[120px] border-r border-b ${GRID} px-3 py-2 text-[14px] ${MONO} text-[#0f172a]`}>{code}</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[14px] text-[#334155]`}>{text}</div>
        </div>
      ))}
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

function IntroTable({ service }: { service: Service }) {
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div tw="flex">
      <div tw={`flex w-[200px] border-r border-b ${GRID} px-3 py-2 bg-[#fafafa] text-[14px] font-semibold text-[#111827]`}>{label}</div>
      <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[14px] text-[#334155]`}>{children}</div>
    </div>
  );
  return (
    <div tw={`flex flex-col border-t border-l ${GRID} mb-6`}>
      <Row label="Сервис">
        <span tw={`flex ${MONO} text-[14px] text-[#0f172a]`}>{service.serviceName}</span>
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
  return <div tw="flex text-[24px] font-bold text-[#111827] mb-4 mt-2">{children}</div>;
}
function H4({ children }: { children: React.ReactNode }) {
  return <div tw="flex text-[17px] font-bold text-[#111827] mb-3 mt-1">{children}</div>;
}

/* --------------------------------------------------------------- full pages */

export function ServicePage({ service, page, total }: { service: Service; page: number; total: number }) {
  return (
    <div tw="flex flex-col w-full h-full font-[Inter] bg-white px-12 pt-10 pb-8">
      <div tw="flex items-center justify-between mb-4">
        <div tw={`flex ${MONO} text-[15px] text-[#6b7280]`}>{service.serviceName}</div>
        <div tw="flex text-[13px] text-[#9ca3af]">Отчёт по API</div>
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

      <div tw="flex items-center justify-between mt-auto pt-6 text-[12px] text-[#9ca3af]">
        <div tw="flex">{service.serviceName}</div>
        <div tw="flex">Страница {page} из {total}</div>
      </div>
    </div>
  );
}

export function TitlePage({ model, total }: { model: ReportModel; total: number }) {
  return (
    <div tw="flex flex-col w-full h-full font-[Inter] bg-white px-12 py-14 justify-between">
      <div tw="flex flex-col">
        <div tw="flex text-[14px] tracking-[3px] uppercase text-[#6b7280]">Отчёт по API · OpenAPI</div>
        <div tw="flex text-[52px] font-bold text-[#111827] mt-3">{model.title}</div>
        <div tw="flex text-[20px] text-[#6b7280] mt-1">Версия {model.version}</div>
        <div tw="flex text-[16px] leading-[26px] text-[#334155] mt-6 pr-10">{model.description}</div>
      </div>

      <div tw={`flex flex-col border-t border-l ${GRID}`}>
        <div tw="flex bg-[#f5f5f5]">
          <div tw={`flex w-[80px] border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>№</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>Сервис</div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[13px] font-semibold text-[#111827]`}>Наименование</div>
        </div>
        {model.services.map((s, i) => (
          <div key={i} tw="flex">
            <div tw={`flex w-[80px] border-r border-b ${GRID} px-3 py-2 text-[14px] text-[#334155]`}>{i + 1}</div>
            <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[13px] ${MONO} text-[#0f172a]`}>{s.serviceName}</div>
            <div tw={`flex flex-1 border-r border-b ${GRID} px-3 py-2 text-[14px] text-[#334155]`}>{s.summary || "—"}</div>
          </div>
        ))}
      </div>

      <div tw="flex items-center justify-between text-[12px] text-[#9ca3af]">
        <div tw="flex">Сгенерировано из openapi.yaml · Takumi</div>
        <div tw="flex">{total} страниц</div>
      </div>
    </div>
  );
}
