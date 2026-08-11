import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import YAML from "yaml";

/**
 * Loads openapi.yaml and flattens it into a render-friendly model: local `$ref`s
 * resolved, path- and operation-level parameters merged, and the concrete
 * request/response examples pulled out for each operation.
 */

export interface Param {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description?: string;
}

export interface ResponseModel {
  status: string;
  description: string;
  example?: unknown;
}

export interface Operation {
  method: string; // upper-case
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags: string[];
  secured: boolean;
  params: Param[];
  requestExample?: unknown;
  responses: ResponseModel[];
}

export interface SecurityScheme {
  key: string;
  type: string;
  detail: string;
}

export interface Spec {
  title: string;
  version: string;
  description: string;
  servers: { url: string; description?: string }[];
  tags: { name: string; description?: string }[];
  securitySchemes: SecurityScheme[];
  operations: Operation[];
}

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

/** Resolve a local JSON pointer like `#/components/schemas/Product`. */
function resolve(doc: any, node: any): any {
  if (node && typeof node === "object" && typeof node.$ref === "string") {
    const path = node.$ref.replace(/^#\//, "").split("/");
    let cur = doc;
    for (const key of path) cur = cur?.[decodeURIComponent(key)];
    return resolve(doc, cur);
  }
  return node;
}

const clean = (s?: string) => (s ? s.trim() : undefined);

function schemaType(schema: any): string {
  if (!schema) return "any";
  if (schema.$ref) return String(schema.$ref).split("/").pop()!;
  if (schema.enum) return schema.enum.map(String).join(" | ");
  if (schema.type === "array") return `${schemaType(schema.items)}[]`;
  return schema.type ?? "object";
}

function jsonExample(container: any, doc: any): unknown {
  const media = resolve(doc, container)?.content?.["application/json"];
  return media?.example;
}

export function loadSpec(): Spec {
  const here = dirname(fileURLToPath(import.meta.url));
  const doc = YAML.parse(readFileSync(join(here, "..", "..", "openapi.yaml"), "utf8"));

  const securitySchemes: SecurityScheme[] = Object.entries(
    doc.components?.securitySchemes ?? {},
  ).map(([key, raw]) => {
    const s = raw as any;
    const detail =
      s.type === "http"
        ? `${s.scheme}${s.bearerFormat ? ` (${s.bearerFormat})` : ""}`
        : s.type === "apiKey"
          ? `${s.in} · ${s.name}`
          : s.type;
    return { key, type: s.type, detail };
  });

  const operations: Operation[] = [];

  for (const [path, rawItem] of Object.entries<any>(doc.paths)) {
    const item = rawItem as any;
    const sharedParams = (item.parameters ?? []).map((p: any) => resolve(doc, p));

    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;

      const params: Param[] = [...sharedParams, ...(op.parameters ?? []).map((p: any) => resolve(doc, p))].map(
        (p: any) => ({
          name: p.name,
          in: p.in,
          required: p.in === "path" ? true : Boolean(p.required),
          type: schemaType(p.schema),
          description: clean(p.description),
        }),
      );

      const responses: ResponseModel[] = Object.entries<any>(op.responses ?? {}).map(([status, rawResp]) => {
        const resp = resolve(doc, rawResp);
        return {
          status,
          description: clean(resp.description) ?? "",
          example: jsonExample(resp, doc),
        };
      });

      // `security: []` at the operation level disables the global requirement.
      const secured = !(Array.isArray(op.security) && op.security.length === 0);

      operations.push({
        method: method.toUpperCase(),
        path,
        operationId: op.operationId ?? `${method}_${path}`,
        summary: clean(op.summary),
        description: clean(op.description),
        tags: op.tags ?? [],
        secured,
        params,
        requestExample: op.requestBody ? jsonExample(op.requestBody, doc) : undefined,
        responses,
      });
    }
  }

  return {
    title: doc.info.title,
    version: doc.info.version,
    description: clean(doc.info.description) ?? "",
    servers: doc.servers ?? [],
    tags: doc.tags ?? [],
    securitySchemes,
    operations,
  };
}
