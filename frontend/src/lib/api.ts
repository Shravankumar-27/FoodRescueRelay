import { API_BASE } from "./config";
import type { ApiSuccess } from "../types/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ field?: string; message?: string }>;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: Array<{ field?: string; message?: string }>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

interface ErrorEnvelope {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

// Share only simultaneous reads, scoped to the exact authorization token.
// Never retain response bodies or coalesce mutations. A write starts a new read
// generation so its subsequent refresh cannot reuse an older in-flight response.
const pendingReads = new Map<string, Promise<unknown>>();
let readGeneration = 0;

export function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (opts.method && opts.method !== "GET") {
    readGeneration++;
    return request<T>(path, opts).finally(() => { readGeneration++; });
  }
  if (opts.signal) return request<T>(path, opts);
  const key = JSON.stringify([readGeneration, opts.token ?? "", path]);
  const existing = pendingReads.get(key);
  if (existing) return existing as Promise<T>;
  const response = request<T>(path, opts).finally(() => { pendingReads.delete(key); });
  pendingReads.set(key, response);
  return response;
}

async function request<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  if (opts.signal?.aborted) controller.abort();
  opts.signal?.addEventListener("abort", abort, {once:true});
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  let res: Response;
  let body: unknown = null;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    try { body = await res.json(); } catch (error) { if (controller.signal.aborted) throw error; }
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    if (timedOut) throw new ApiError("TIMEOUT", "The API took too long to respond. Please retry. For a submitted change, check its status first.", 0);
    throw new ApiError("OFFLINE", "Could not reach the Food Rescue Relay API. Check the connection and try again.", 0);
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", abort);
  }

  const envelope = body as ErrorEnvelope | null;
  if (!res.ok || envelope?.success !== true) {
    throw new ApiError(
      envelope?.error?.code ?? "HTTP_ERROR",
      envelope?.error?.message ?? "The Food Rescue Relay API returned an unexpected response. Try again.",
      res.status,
      envelope?.error?.details,
    );
  }

  return (body as ApiSuccess<T>).data;
}
