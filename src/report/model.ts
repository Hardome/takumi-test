import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import YAML from "yaml";

/**
 * Extracts the api-reports "service report" model from openapi.yaml: for every
 * operation, an intro (summary/description + request & response examples), the
 * parameter tables split by location, flattened request-body and response
 * property rows, and the list of HTTP codes. Mirrors the Handlebars data shape
 * used by the original api-reports templates.
 */

export interface ParamRow {
  name: string;
  format: string; // "Формат данных"
  multiplicity: string; // "Кратность"
  length: string; // "Количество символов"
  pattern: string; // "Паттерн"
  example: string; // "Пример"
  description: string; // "Описание"
}

export interface Service {
  serviceName: string; // e.g. "POST /orders"
  summary: string;
  description: string;
  inParamsExample: unknown; // "Пример запроса"
  outExample: unknown; // "Пример ответа"
  query: ParamRow[];
  path: ParamRow[];
  headers: ParamRow[];
  body: ParamRow[];
  response: ParamRow[];
  codes: [string, string][];
}

export interface ReportModel {
  title: string;
  version: string;
  description: string;
  services: Service[];
}

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const DASH = "—";

/* --------------------------------------------------------------- ref utils */

function deref(doc: any, node: any): any {
  let n = node;
  let guard = 0;
  while (n && typeof n === "object" && typeof n.$ref === "string" && guard++ < 20) {
    const path = n.$ref.replace(/^#\//, "").split("/");
    let cur = doc;
    for (const k of path) cur = cur?.[decodeURIComponent(k)];
    n = cur;
  }
  return n;
}

/** Merge an `allOf` chain into a single object schema. */
function flatten(doc: any, schema: any): any {
  const s = deref(doc, schema);
  if (!s || !s.allOf) return s ?? {};
  const out: any = { type: "object", properties: {}, required: [] };
  for (const part of s.allOf) {
    const p = flatten(doc, part);
    Object.assign(out.properties, p.properties ?? {});
    if (p.required) out.required.push(...p.required);
    if (p.type && p.type !== "object") out.type = p.type;
  }
  for (const [k, v] of Object.entries(s)) if (k !== "allOf") (out as any)[k] = v;
  return out;
}

/* --------------------------------------------------------- schema → labels */

const clean = (s?: string) => (s ? s.replace(/\s+/g, " ").trim() : "");

function typeLabel(doc: any, schema: any): string {
  const s = deref(doc, schema);
  if (!s) return DASH;
  if (schema?.$ref) {
    const name = String(schema.$ref).split("/").pop()!;
    return name;
  }
  if (s.type === "array") return `array(${typeLabel(doc, s.items)})`;
  if (s.enum) return `${s.type ?? "string"} enum`;
  return `${s.type ?? "object"}${s.format ? `(${s.format})` : ""}`;
}

function lengthLabel(s: any): string {
  const parts = [s.minLength, s.maxLength];
  if (parts[0] == null && parts[1] == null) {
    if (s.minimum != null || s.maximum != null) return `${s.minimum ?? ""}..${s.maximum ?? ""}`;
    return DASH;
  }
  return `${s.minLength ?? ""}..${s.maxLength ?? ""}`;
}

function exampleLabel(s: any): string {
  const v = s?.example ?? (Array.isArray(s?.enum) ? s.enum[0] : undefined) ?? s?.const ?? s?.default;
  if (v == null) return DASH;
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

function paramRowFromParameter(doc: any, p: any): ParamRow {
  const schema = deref(doc, p.schema) ?? {};
  return {
    name: p.name,
    format: typeLabel(doc, p.schema),
    multiplicity: p.in === "path" || p.required ? "[1]" : "[0..1]",
    length: lengthLabel(schema),
    pattern: schema.pattern ?? DASH,
    example: p.example != null ? String(p.example) : exampleLabel(schema),
    description: clean(p.description),
  };
}

/** Flatten object properties into rows, expanding one level of nested objects. */
function expandProps(doc: any, rawSchema: any, parent = ""): ParamRow[] {
  const schema = flatten(doc, rawSchema);
  if (!schema || !schema.properties) return [];
  const required = new Set<string>(schema.required ?? []);
  const rows: ParamRow[] = [];

  for (const [key, rawProp] of Object.entries<any>(schema.properties)) {
    const prop = flatten(doc, rawProp);
    rows.push({
      name: parent ? `${parent}\\${key}` : key,
      format: typeLabel(doc, rawProp),
      multiplicity: required.has(key) ? "[1]" : "[0..1]",
      length: lengthLabel(prop),
      pattern: prop.pattern ?? DASH,
      example: exampleLabel(prop),
      description: clean(prop.description),
    });

    // one level of nesting: object, or array-of-object
    if (!parent) {
      const child = prop.type === "array" ? flatten(doc, prop.items) : prop;
      if (child && child.type === "object" && child.properties) {
        rows.push(...expandProps(doc, child, key));
      }
    }
  }
  return rows;
}

function jsonExample(doc: any, container: any): unknown {
  const media = deref(doc, container)?.content?.["application/json"];
  return media?.example;
}

const CODE_TEXT: Record<string, string> = {
  "200": "OK — успешный ответ",
  "201": "Created — ресурс создан",
  "204": "No Content — успех без тела",
  "400": "Bad Request — некорректный запрос",
  "401": "Unauthorized — не авторизован",
  "404": "Not Found — ресурс не найден",
  "409": "Conflict — конфликт состояния",
  "422": "Unprocessable Entity — ошибка валидации",
  "429": "Too Many Requests — превышен лимит",
};

/* -------------------------------------------------------------------- load */

export function loadReportModel(specPath?: string): ReportModel {
  const here = dirname(fileURLToPath(import.meta.url));
  const file = specPath ?? join(here, "..", "..", "openapi.yaml");
  const doc = YAML.parse(readFileSync(file, "utf8"));

  const services: Service[] = [];

  for (const [path, rawItem] of Object.entries<any>(doc.paths)) {
    const shared = (rawItem.parameters ?? []).map((p: any) => deref(doc, p));
    for (const method of METHODS) {
      const op = rawItem[method];
      if (!op) continue;

      const params = [...shared, ...(op.parameters ?? []).map((p: any) => deref(doc, p))];
      const byIn = (loc: string) => params.filter((p) => p.in === loc).map((p) => paramRowFromParameter(doc, p));

      const reqSchema = deref(doc, op.requestBody)?.content?.["application/json"]?.schema;
      const success = Object.entries<any>(op.responses ?? {}).find(([code]) => code.startsWith("2"));
      const respSchema = success ? deref(doc, success[1])?.content?.["application/json"]?.schema : undefined;

      services.push({
        serviceName: `${method.toUpperCase()} ${path}`,
        summary: clean(op.summary),
        description: clean(op.description),
        inParamsExample: op.requestBody ? jsonExample(doc, op.requestBody) : undefined,
        outExample: success ? jsonExample(doc, success[1]) : undefined,
        query: byIn("query"),
        path: byIn("path"),
        headers: byIn("header"),
        body: reqSchema ? expandProps(doc, reqSchema) : [],
        response: respSchema ? expandProps(doc, respSchema) : [],
        // prefer the spec's own response description, fall back to a code label
        codes: Object.entries<any>(op.responses ?? {}).map((entry) => {
          const [code, raw] = entry;
          return [code, clean(deref(doc, raw)?.description) || CODE_TEXT[code] || "—"] as [string, string];
        }),
      });
    }
  }

  return {
    title: doc.info.title,
    version: doc.info.version,
    description: clean(doc.info.description),
    services,
  };
}
