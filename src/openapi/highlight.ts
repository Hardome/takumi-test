/**
 * A tiny JSON syntax highlighter. `prettyLines` pretty-prints a value; each line
 * is then tokenized into colored spans that the renderer draws with a monospace
 * font (leading indentation preserved via `whitespace-pre`).
 */

// Light-theme syntax colors, tuned for a white code panel in the A4 PDF.
export const codeColor = {
  key: "text-[#0369a1]", // sky-700
  string: "text-[#047857]", // emerald-700
  number: "text-[#be123c]", // rose-700
  keyword: "text-[#6d28d9]", // violet-700 (true/false/null)
  punct: "text-[#64748b]", // slate-500
  plain: "text-[#1e293b]", // slate-800
} as const;

export interface Span {
  text: string;
  color: string;
}

export function prettyLines(value: unknown): string[] {
  return JSON.stringify(value, null, 2).split("\n");
}

const TOKEN = /(\s+)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;

export function tokenizeLine(line: string): Span[] {
  const spans: Span[] = [];
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [full, ws, str, num, kw, punct] = m;
    if (ws) {
      spans.push({ text: ws, color: codeColor.plain });
    } else if (str) {
      // A string that is immediately followed by a colon is an object key.
      const rest = line.slice(m.index + full.length);
      const isKey = /^\s*:/.test(rest);
      spans.push({ text: str, color: isKey ? codeColor.key : codeColor.string });
    } else if (num) {
      spans.push({ text: num, color: codeColor.number });
    } else if (kw) {
      spans.push({ text: kw, color: codeColor.keyword });
    } else if (punct) {
      spans.push({ text: punct, color: codeColor.punct });
    }
  }
  return spans;
}
