import "server-only";
import type { NextRequest } from "next/server";

const MAX_BODY_BYTES = 10_000;

/** Reads a small JSON body; anything oversized or malformed becomes null. */
export async function readJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Client address for rate limiting only; proxies can spoof it, so it is never trusted for anything else. */
export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Rejects cross-site form posts; browsers always send Origin on fetch POSTs. */
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });
