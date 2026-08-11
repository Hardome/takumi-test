import { prettyLines, tokenizeLine } from "./highlight.js";
import type { Operation, Param, ResponseModel, Spec } from "./loadSpec.js";

/* ------------------------------------------------------------------ palette */

const methodStyle: Record<string, string> = {
  GET: "bg-[#0c2a4d] text-[#7dd3fc]",
  POST: "bg-[#0e2f1c] text-[#86efac]",
  PATCH: "bg-[#3a2a0a] text-[#fbbf24]",
  PUT: "bg-[#3a230a] text-[#fdba74]",
  DELETE: "bg-[#3a1414] text-[#fca5a5]",
};

function statusStyle(status: string): string {
  const c = status[0];
  if (c === "2") return "bg-[#0e2f1c] text-[#86efac]";
  if (c === "3") return "bg-[#0c2a4d] text-[#7dd3fc]";
  if (c === "4") return "bg-[#3a2a0a] text-[#fbbf24]";
  return "bg-[#3a1414] text-[#fca5a5]";
}

const MONO = "font-['JetBrains_Mono']";
const card = "flex flex-col rounded-xl border border-[#1f2937] overflow-hidden";

/* --------------------------------------------------------------- primitives */

function MethodBadge({ method }: { method: string }) {
  return (
    <div tw={`flex items-center justify-center rounded-lg px-3 py-1.5 text-[20px] font-bold ${MONO} ${methodStyle[method] ?? "bg-[#1f2937] text-[#e5e7eb]"}`}>
      {method}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div tw="flex text-[13px] font-bold tracking-[2px] text-[#6b7280] mt-7 mb-3">{children}</div>
  );
}

function CodeBlock({ label, value }: { label: string; value: unknown }) {
  const lines = prettyLines(value);
  return (
    <div tw={card}>
      <div tw="flex px-4 py-2 bg-[#0e1420] border-b border-[#1f2937] text-[12px] font-semibold tracking-[1px] text-[#6b7280]">
        {label}
      </div>
      <div tw="flex flex-col bg-[#0b0f17] px-5 py-4">
        {lines.map((line, i) => (
          <div key={i} tw="flex">
            {tokenizeLine(line).map((s, j) => (
              <span key={j} tw={`${MONO} text-[17px] leading-[26px] whitespace-pre ${s.color}`}>
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
    <div tw={card}>
      <div tw="flex px-4 py-2.5 bg-[#0e1420] text-[12px] font-semibold tracking-[1px] text-[#6b7280]">
        <div tw="flex w-[230px]">NAME</div>
        <div tw="flex w-[90px]">IN</div>
        <div tw="flex w-[280px]">TYPE</div>
        <div tw="flex w-[90px]">REQ</div>
        <div tw="flex flex-1">DESCRIPTION</div>
      </div>
      {params.map((p, i) => (
        <div key={i} tw="flex items-start px-4 py-3 border-t border-[#1f2937] text-[16px]">
          <div tw={`flex w-[230px] ${MONO} text-[15px] text-[#e5e7eb]`}>{p.name}</div>
          <div tw="flex w-[90px] text-[#9ca3af]">{p.in}</div>
          <div tw={`flex w-[280px] pr-3 ${MONO} text-[15px] text-[#a5b4fc]`}>{p.type}</div>
          <div tw="flex w-[90px]">
            {p.required ? (
              <div tw="flex rounded px-2 py-0.5 text-[13px] font-semibold bg-[#3a1414] text-[#fca5a5]">yes</div>
            ) : (
              <div tw="flex text-[#6b7280]">no</div>
            )}
          </div>
          <div tw="flex flex-1 text-[#9ca3af]">{p.description ?? ""}</div>
        </div>
      ))}
    </div>
  );
}

function ResponseRow({ resp }: { resp: ResponseModel }) {
  return (
    <div tw="flex flex-col">
      <div tw="flex items-center gap-3 mb-2">
        <div tw={`flex items-center justify-center rounded-md px-2.5 py-1 text-[16px] font-bold ${MONO} ${statusStyle(resp.status)}`}>
          {resp.status}
        </div>
        <div tw="flex text-[17px] text-[#e5e7eb]">{resp.description}</div>
      </div>
      {resp.example !== undefined && <CodeBlock label="RESPONSE BODY" value={resp.example} />}
    </div>
  );
}

/* --------------------------------------------------------------- full pages */

export function EndpointPage({ op, index, total }: { op: Operation; index: number; total: number }) {
  return (
    <div tw="flex flex-col w-full h-full font-[Inter] bg-[#0b0f17] px-14 pt-12 pb-10">
      {/* header */}
      <div tw="flex items-center justify-between">
        <div tw="flex items-center gap-4">
          <MethodBadge method={op.method} />
          <div tw={`flex ${MONO} text-[26px] text-[#e5e7eb]`}>{op.path}</div>
        </div>
        <div tw="flex items-center gap-2">
          <div tw={`flex rounded-full px-3 py-1 text-[13px] font-semibold ${op.secured ? "bg-[#312e81] text-[#c7d2fe]" : "bg-[#1f2937] text-[#9ca3af]"}`}>
            {op.secured ? "🔒 Bearer" : "Public"}
          </div>
          {op.tags[0] && (
            <div tw="flex rounded-full px-3 py-1 text-[13px] font-semibold bg-[#111827] border border-[#1f2937] text-[#9ca3af]">
              {op.tags[0]}
            </div>
          )}
        </div>
      </div>

      {op.summary && <div tw="flex text-[26px] font-bold text-[#e5e7eb] mt-6">{op.summary}</div>}
      {op.description && <div tw="flex text-[17px] leading-[26px] text-[#9ca3af] mt-2">{op.description}</div>}

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
      <div tw="flex flex-col gap-4">
        {op.responses.map((r, i) => (
          <ResponseRow key={i} resp={r} />
        ))}
      </div>

      {/* footer */}
      <div tw="flex items-center justify-between mt-auto pt-8 text-[13px] text-[#6b7280]">
        <div tw={`flex ${MONO}`}>operationId: {op.operationId}</div>
        <div tw="flex">{index} / {total}</div>
      </div>
    </div>
  );
}

export function CoverPage({ spec, tagCounts }: { spec: Spec; tagCounts: [string, number][] }) {
  return (
    <div tw="flex flex-col w-full h-full font-[Inter] bg-[linear-gradient(135deg,#0b0f17_0%,#131a2b_60%,#1b1140_100%)] px-14 py-14">
      <div tw="flex items-center gap-3">
        <div tw="flex text-[15px] font-semibold tracking-[4px] uppercase text-[#a5b4fc]">OpenAPI 3.1 · Reference</div>
      </div>
      <div tw="flex items-center gap-4 mt-3">
        <div tw="flex text-[64px] font-bold text-[#e5e7eb]">{spec.title}</div>
        <div tw="flex rounded-full px-4 py-1.5 text-[20px] font-bold bg-[#312e81] text-[#c7d2fe]">v{spec.version}</div>
      </div>
      <div tw="flex text-[19px] leading-[28px] text-[#9ca3af] mt-4 pr-16">{spec.description}</div>

      <div tw="flex gap-4 mt-8">
        {/* servers + auth */}
        <div tw="flex flex-col w-[560px] gap-4">
          <div tw={card}>
            <div tw="flex px-4 py-2 bg-[#0e1420] text-[12px] font-semibold tracking-[1px] text-[#6b7280]">SERVERS</div>
            {spec.servers.map((s, i) => (
              <div key={i} tw="flex flex-col px-4 py-3 border-t border-[#1f2937]">
                <div tw={`flex ${MONO} text-[17px] text-[#7dd3fc]`}>{s.url}</div>
                <div tw="flex text-[14px] text-[#6b7280] mt-0.5">{s.description ?? ""}</div>
              </div>
            ))}
          </div>
          <div tw={card}>
            <div tw="flex px-4 py-2 bg-[#0e1420] text-[12px] font-semibold tracking-[1px] text-[#6b7280]">AUTHENTICATION</div>
            {spec.securitySchemes.map((s, i) => (
              <div key={i} tw="flex items-center justify-between px-4 py-3 border-t border-[#1f2937]">
                <div tw={`flex ${MONO} text-[16px] text-[#e5e7eb]`}>{s.key}</div>
                <div tw="flex text-[15px] text-[#9ca3af]">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* endpoints by tag */}
        <div tw={`flex flex-col flex-1 ${card}`}>
          <div tw="flex px-4 py-2 bg-[#0e1420] text-[12px] font-semibold tracking-[1px] text-[#6b7280]">ENDPOINTS BY TAG</div>
          {tagCounts.map(([tag, count], i) => (
            <div key={i} tw="flex items-center justify-between px-4 py-3 border-t border-[#1f2937]">
              <div tw="flex text-[18px] text-[#e5e7eb]">{tag}</div>
              <div tw="flex rounded-full px-3 py-0.5 text-[14px] font-semibold bg-[#111827] border border-[#1f2937] text-[#9ca3af]">
                {count} {count === 1 ? "endpoint" : "endpoints"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div tw="flex items-center gap-2 mt-auto pt-8 text-[14px] text-[#6b7280]">
        <div tw="flex">Rendered from openapi.yaml by Takumi · JSX to image, no browser</div>
      </div>
    </div>
  );
}
