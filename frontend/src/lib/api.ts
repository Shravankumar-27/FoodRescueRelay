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
}

interface ErrorEnvelope {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("OFFLINE", "Could not reach the RescueRelay API. Check the connection and try again.", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const envelope = body as ErrorEnvelope | null;
  if (!res.ok || envelope?.success !== true) {
    throw new ApiError(
      envelope?.error?.code ?? "HTTP_ERROR",
      envelope?.error?.message ?? "The RescueRelay API returned an unexpected response. Try again.",
      res.status,
      envelope?.error?.details,
    );
  }

  return (body as ApiSuccess<T>).data;
}
