import { prettyLines, tokenizeLine } from "./highlight.js";
import type { Operation, Param, ResponseModel, Spec } from "./loadSpec.js";

/*
 * Light-theme API-reference components, authored to A4 content width so the PDF
 * flows them across A4 pages (no fixed canvas: no `h-full`, no per-page footer —
 * the repeating footer band comes from takumi-pdf). Colors mirror the report's
 * white/gray print look.
 */

/* ------------------------------------------------------------------ palette */

const methodStyle: Record<string, string> = {
  GET: "bg-[#dbeafe] text-[#1d4ed8]",
  POST: "bg-[#dcfce7] text-[#15803d]",
  PATCH: "bg-[#fef9c3] text-[#a16207]",
  PUT: "bg-[#ffedd5] text-[#c2410c]",
  DELETE: "bg-[#fee2e2] text-[#b91c1c]",
};

function statusStyle(status: string): string {
  const c = status[0];
  if (c === "2") return "bg-[#dcfce7] text-[#15803d]";
  if (c === "3") return "bg-[#dbeafe] text-[#1d4ed8]";
  if (c === "4") return "bg-[#fef9c3] text-[#a16207]";
  return "bg-[#fee2e2] text-[#b91c1c]";
}

const MONO = "font-['JetBrains_Mono']";
const GRID = "border-[#e5e7eb]";
const card = `flex flex-col rounded-lg border ${GRID} overflow-hidden`;

/* --------------------------------------------------------------- primitives */

function MethodBadge({ method }: { method: string }) {
  return (
    <div tw={`flex items-center justify-center rounded-md px-2.5 py-1 text-[15px] font-bold ${MONO} ${methodStyle[method] ?? "bg-[#f3f4f6] text-[#374151]"}`}>
      {method}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div tw="flex text-[11px] font-bold tracking-[1.5px] text-[#6b7280] mt-5 mb-2">{children}</div>;
}

function CodeBlock({ label, value }: { label: string; value: unknown }) {
  const lines = prettyLines(value);
  return (
    <div tw={card}>
      <div tw={`flex px-3 py-1.5 bg-[#f3f4f6] border-b ${GRID} text-[10px] font-semibold tracking-[0.5px] text-[#6b7280]`}>{label}</div>
      <div tw="flex flex-col bg-[#f8fafc] px-4 py-3">
        {lines.map((line, i) => (
          <div key={i} tw="flex">
            {tokenizeLine(line).map((s, j) => (
              <span key={j} tw={`${MONO} text-[12px] leading-[19px] whitespace-pre ${s.color}`}>
                {s.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div tw={`flex flex-col border-t border-l ${GRID}`}>
      <div tw="flex bg-[#f5f5f5] text-[10px] font-semibold tracking-[0.5px] text-[#6b7280]">
        <div tw={`flex w-[150px] border-r border-b ${GRID} px-2.5 py-1.5`}>NAME</div>
        <div tw={`flex w-[52px] border-r border-b ${GRID} px-2.5 py-1.5`}>IN</div>
        <div tw={`flex w-[120px] border-r border-b ${GRID} px-2.5 py-1.5`}>TYPE</div>
        <div tw={`flex w-[46px] border-r border-b ${GRID} px-2.5 py-1.5`}>REQ</div>
        <div tw={`flex flex-1 border-r border-b ${GRID} px-2.5 py-1.5`}>DESCRIPTION</div>
      </div>
      {params.map((p, i) => (
        <div key={i} tw="flex items-stretch">
          <div tw={`flex w-[150px] border-r border-b ${GRID} px-2.5 py-1.5 break-all ${MONO} text-[12px] text-[#0f172a]`}>{p.name}</div>
          <div tw={`flex w-[52px] border-r border-b ${GRID} px-2.5 py-1.5 text-[12px] text-[#6b7280]`}>{p.in}</div>
          <div tw={`flex w-[120px] border-r border-b ${GRID} px-2.5 py-1.5 break-all ${MONO} text-[11px] text-[#4338ca]`}>{p.type}</div>
          <div tw={`flex w-[46px] border-r border-b ${GRID} px-2.5 py-1.5 text-[12px]`}>
            {p.required ? <span tw="flex text-[#b91c1c] font-semibold">yes</span> : <span tw="flex text-[#9ca3af]">no</span>}
          </div>
          <div tw={`flex flex-1 border-r border-b ${GRID} px-2.5 py-1.5 text-[12px] leading-[18px] text-[#334155]`}>{p.description ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

function ResponseRow({ resp }: { resp: ResponseModel }) {
  return (
    <div tw="flex flex-col mb-3">
      <div tw="flex items-center gap-2 mb-1.5">
        <div tw={`flex items-center justify-center rounded px-2 py-0.5 text-[13px] font-bold ${MONO} ${statusStyle(resp.status)}`}>{resp.status}</div>
        <div tw="flex text-[13px] text-[#334155]">{resp.description}</div>
      </div>
      {resp.example !== undefined && <CodeBlock label="RESPONSE BODY" value={resp.example} />}
    </div>
  );
}

/* --------------------------------------------------------------- full pages */

export function EndpointPage({ op, index, total }: { op: Operation; index: number; total: number }) {
  return (
    <div tw="flex flex-col w-full font-[Inter] text-[#111827]">
      <div tw={`flex items-center justify-between border-b ${GRID} pb-3`}>
        <div tw="flex items-center gap-2.5">
          <MethodBadge method={op.method} />
          <div tw={`flex ${MONO} text-[19px] text-[#111827] break-all`}>{op.path}</div>
        </div>
        <div tw="flex items-center gap-1.5">
          <div tw={`flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${op.secured ? "bg-[#e0e7ff] text-[#3730a3]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
            {op.secured ? "🔒 Bearer" : "Public"}
          </div>
          {op.tags[0] && (
            <div tw={`flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#f3f4f6] border ${GRID} text-[#6b7280]`}>{op.tags[0]}</div>
          )}
        </div>
      </div>

      {op.summary && <div tw="flex text-[19px] font-bold text-[#111827] mt-3">{op.summary}</div>}
      {op.description && <div tw="flex text-[13px] leading-[20px] text-[#4b5563] mt-1.5">{op.description}</div>}

      {op.params.length > 0 && (
        <>
          <SectionTitle>PARAMETERS</SectionTitle>
          <ParamTable params={op.params} />
        </>
      )}

      {op.requestExample !== undefined && (
        <>
          <SectionTitle>REQUEST BODY</SectionTitle>
          <CodeBlock label="application/json" value={op.requestExample} />
        </>
      )}

      <SectionTitle>RESPONSES</SectionTitle>
      <div tw="flex flex-col">
        {op.responses.map((r, i) => (
          <ResponseRow key={i} resp={r} />
        ))}
      </div>

      <div tw={`flex items-center justify-between mt-3 pt-2.5 border-t ${GRID} text-[10px] text-[#9ca3af]`}>
        <div tw={`flex ${MONO}`}>operationId: {op.operationId}</div>
        <div tw="flex">{index} / {total}</div>
      </div>
    </div>
  );
}

export function CoverPage({ spec, tagCounts }: { spec: Spec; tagCounts: [string, number][] }) {
  return (
    <div tw="flex flex-col w-full font-[Inter] text-[#111827]">
      <div tw="flex text-[12px] font-semibold tracking-[3px] uppercase text-[#6366f1]">OpenAPI 3.1 · Reference</div>
      <div tw="flex items-center gap-3 mt-2">
        <div tw="flex text-[44px] font-bold text-[#111827]">{spec.title}</div>
        <div tw="flex rounded-full px-3 py-1 text-[15px] font-bold bg-[#e0e7ff] text-[#3730a3]">v{spec.version}</div>
      </div>
      <div tw="flex text-[15px] leading-[24px] text-[#4b5563] mt-3">{spec.description}</div>

      <div tw="flex text-[11px] font-bold tracking-[1.5px] text-[#6b7280] mt-7 mb-2">SERVERS</div>
      <div tw={card}>
        {spec.servers.map((s, i) => (
          <div key={i} tw={`flex flex-col px-3 py-2 ${i > 0 ? `border-t ${GRID}` : ""}`}>
            <div tw={`flex ${MONO} text-[14px] text-[#0369a1]`}>{s.url}</div>
            <div tw="flex text-[12px] text-[#9ca3af] mt-0.5">{s.description ?? ""}</div>
          </div>
        ))}
      </div>

      <div tw="flex text-[11px] font-bold tracking-[1.5px] text-[#6b7280] mt-6 mb-2">AUTHENTICATION</div>
      <div tw={card}>
        {spec.securitySchemes.map((s, i) => (
          <div key={i} tw={`flex items-center justify-between px-3 py-2 ${i > 0 ? `border-t ${GRID}` : ""}`}>
            <div tw={`flex ${MONO} text-[13px] text-[#111827]`}>{s.key}</div>
            <div tw="flex text-[13px] text-[#6b7280]">{s.detail}</div>
          </div>
        ))}
      </div>

      <div tw="flex text-[11px] font-bold tracking-[1.5px] text-[#6b7280] mt-6 mb-2">ENDPOINTS BY TAG</div>
      <div tw={card}>
        {tagCounts.map(([tag, count], i) => (
          <div key={i} tw={`flex items-center justify-between px-3 py-2 ${i > 0 ? `border-t ${GRID}` : ""}`}>
            <div tw="flex text-[14px] text-[#111827]">{tag}</div>
            <div tw={`flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold bg-[#f3f4f6] border ${GRID} text-[#6b7280]`}>
              {count} {count === 1 ? "endpoint" : "endpoints"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
