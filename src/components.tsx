import { tw, statusTokens, type StatusKey } from "./tokens.js";
import { currency, type Customer } from "./data.js";

/**
 * Column layout for the table. Each column carries the Tailwind width + justify
 * classes so the header and every row share one definition — the classic reason
 * tables drift. Right-aligned columns add `pr-4` so numbers don't kiss the next
 * column's label.
 */
const columns = [
  { key: "id", label: "ID", cell: "w-[110px] justify-start" },
  { key: "name", label: "Customer", cell: "w-[320px] justify-start" },
  { key: "plan", label: "Plan", cell: "w-[180px] justify-start" },
  { key: "mrr", label: "MRR", cell: "w-[160px] justify-end pr-4" },
  { key: "seats", label: "Seats", cell: "w-[140px] justify-end pr-4" },
  { key: "status", label: "Status", cell: "w-[190px] justify-start" },
] as const;

export function Badge({ status }: { status: StatusKey }) {
  const t = statusTokens[status];
  return (
    <div tw={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[15px] font-semibold ${t.bg} ${t.text}`}>
      <div tw={`w-2 h-2 rounded-full ${t.dot}`} />
      {t.label}
    </div>
  );
}

function HeaderRow() {
  return (
    <div tw={`flex w-full px-6 py-2.5 border-b-2 ${tw.border} ${tw.textFaint} text-[15px] font-semibold tracking-wider`}>
      {columns.map((c) => (
        <div key={c.key} tw={`flex items-center ${c.cell}`}>
          {c.label.toUpperCase()}
        </div>
      ))}
    </div>
  );
}

function Row({ row, zebra }: { row: Customer; zebra: boolean }) {
  return (
    <div tw={`flex w-full items-center px-6 py-3.5 text-lg ${zebra ? tw.surfaceAlt : ""} ${tw.text}`}>
      <div tw={`flex items-center w-[110px] justify-start ${tw.textMuted}`}>#{row.id}</div>
      <div tw="flex items-center w-[320px] justify-start font-semibold">{row.name}</div>
      <div tw="flex items-center w-[180px] justify-start">{row.plan}</div>
      <div tw="flex items-center w-[160px] justify-end pr-4 font-semibold">{currency(row.mrr)}</div>
      <div tw={`flex items-center w-[140px] justify-end pr-4 ${tw.textMuted}`}>{row.seats}</div>
      <div tw="flex items-center w-[190px] justify-start">
        <Badge status={row.status} />
      </div>
    </div>
  );
}

export function Table({ rows }: { rows: Customer[] }) {
  return (
    <div tw={`flex flex-col w-full rounded-[20px] border overflow-hidden ${tw.border} ${tw.surface}`}>
      <HeaderRow />
      {rows.map((r, i) => (
        <Row key={r.id} row={r} zebra={i % 2 === 1} />
      ))}
    </div>
  );
}

/** Pagination footer: row range + numbered page buttons + "Page X of Y". */
export function Pagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}) {
  return (
    <div tw={`flex w-full items-center justify-between mt-4 text-[15px] ${tw.textMuted}`}>
      <div tw="flex">
        Showing {rangeStart}–{rangeEnd} of {total}
      </div>

      <div tw="flex items-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, i) => {
          const active = i + 1 === page;
          const base = "flex items-center justify-center min-w-[34px] h-[34px] px-2.5 rounded-lg border font-semibold";
          return (
            <div
              key={i}
              tw={active ? `${base} ${tw.brandBg} ${tw.brandBorder} text-white` : `${base} ${tw.surface} ${tw.border} ${tw.textMuted}`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      <div tw={`flex ${tw.textFaint}`}>
        Page {page} of {totalPages}
      </div>
    </div>
  );
}

/** The OG-card shell: header, slot for content, and footer. */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div tw={`flex flex-col w-full h-full font-[Inter] p-10 ${tw.pageBg}`}>
      <div tw="flex items-center justify-between mb-6">
        <div tw="flex flex-col">
          <div tw={`text-3xl font-bold ${tw.text}`}>{title}</div>
          <div tw={`text-lg mt-1 ${tw.textMuted}`}>{subtitle}</div>
        </div>
        <div tw={`flex items-center rounded-full px-4 py-1.5 text-[15px] font-semibold text-[#c7d2fe] ${tw.brandSoftBg}`}>
          Rendered by Takumi
        </div>
      </div>

      {children}
    </div>
  );
}
