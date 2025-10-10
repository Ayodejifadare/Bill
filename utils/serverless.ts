/**
 * Lightweight serverless function wrapper using the Web Fetch API.
 *
 * Goals:
 * - Unified JSON/text responses
 * - Optional CORS handling (incl. preflight)
 * - Consistent error handling with safe JSON error body
 * - Platform-agnostic (Vercel/Netlify/Cloudflare/Workers runtime compatible)
 */

export type HandlerResult =
  | Response
  | {
      status?: number;
      headers?: Record<string, string>;
      body?: unknown;
    };

export type ServerlessHandler = (
  req: Request,
  ctx: {
    json: (data: unknown, init?: ResponseInit) => Response;
    text: (data: string, init?: ResponseInit) => Response;
  },
) => Promise<HandlerResult> | HandlerResult;

export interface CorsOptions {
  origin?: string | RegExp | ((origin: string | null) => boolean) | "*";
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}

function mergeHeaders(
  base: HeadersInit | undefined,
  extra: Record<string, string>,
): Headers {
  const headers = new Headers(base);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return headers;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = mergeHeaders(init.headers, {
    "Content-Type": "application/json; charset=utf-8",
  });
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function text(data: string, init: ResponseInit = {}): Response {
  const headers = mergeHeaders(init.headers, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  return new Response(data, { ...init, headers });
}

function resolveCorsOrigin(
  originConf: CorsOptions["origin"],
  origin: string | null,
): string | null {
  if (!originConf) return null;
  if (originConf === "*") return "*";
  if (typeof originConf === "string") return originConf;
  if (originConf instanceof RegExp)
    return origin && originConf.test(origin) ? origin : null;
  if (typeof originConf === "function")
    return originConf(origin) ? origin || "*" : null;
  return null;
}

export function withCors(
  handler: ServerlessHandler,
  options: CorsOptions = {},
): ServerlessHandler {
  const allowMethods = (
    options.methods || ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  ).join(", ");
  const allowHeaders = (
    options.headers || ["Content-Type", "Authorization", "x-user-id"]
  ).join(", ");
  const allowCredentials = options.credentials ?? true;
  const maxAge = options.maxAge ?? 600;

  return async (req, ctx) => {
    const requestOrigin = req.headers.get("Origin");
    const allowOrigin = resolveCorsOrigin(options.origin ?? "*", requestOrigin);

    // Handle preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...(allowOrigin
            ? { "Access-Control-Allow-Origin": allowOrigin }
            : {}),
          "Access-Control-Allow-Methods": allowMethods,
          "Access-Control-Allow-Headers": allowHeaders,
          ...(allowCredentials
            ? { "Access-Control-Allow-Credentials": "true" }
            : {}),
          "Access-Control-Max-Age": String(maxAge),
        },
      });
    }

    const res = await handler(req, ctx);
    const response =
      res instanceof Response
        ? res
        : json(res?.body ?? null, {
            status: res?.status ?? 200,
            headers: res?.headers,
          });

    const headers = new Headers(response.headers);
    if (allowOrigin) headers.set("Access-Control-Allow-Origin", allowOrigin);
    if (allowCredentials)
      headers.set("Access-Control-Allow-Credentials", "true");
    return new Response(response.body, { status: response.status, headers });
  };
}

export function withErrorHandling(
  handler: ServerlessHandler,
): ServerlessHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      // Best-effort logging in serverless environments
      try {
        console.error("[serverless]", message, err);
      } catch (logError) {
        // ignore logging failures in restricted environments
      }
      return json({ error: message }, { status: 500 });
    }
  };
}

export function createServerlessFunction(
  handler: ServerlessHandler,
  cors?: CorsOptions,
) {
  const base: ServerlessHandler = async (req, _ctx) =>
    handler(req, { json, text });
  const wrapped = withErrorHandling(cors ? withCors(base, cors) : base);
  // Standard export for runtimes expecting a fetch handler
  const fetch = (request: Request) => wrapped(request, { json, text });
  // Also return the wrapped function for frameworks that import directly
  return Object.assign(fetch, { wrapped });
}

/**
 * Example usage (pseudo-route file):
 *
 * import { createServerlessFunction } from '../utils/serverless';
 *
 * export default createServerlessFunction(async (req, { json, text }) => {
 *   if (req.method === 'GET') {
 *     return json({ ok: true, now: new Date().toISOString() });
 *   }
 *   if (req.method === 'POST') {
 *     const payload = await req.json().catch(() => ({}));
 *     return { status: 201, body: { received: payload } };
 *   }
 *   return { status: 405, headers: { Allow: 'GET, POST' }, body: { error: 'Method Not Allowed' } };
 * }, { origin: '*', methods: ['GET', 'POST', 'OPTIONS'] });
 */
